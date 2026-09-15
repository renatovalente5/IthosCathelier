#!/usr/bin/env python3
"""
Rasteriza os ícones e compõe os cartões de partilha.

Os SVG chegam do vetor original da cliente. O macOS rasteriza-os com o
`qlmanage`; noutros sistemas (a Action, por exemplo) o passo é saltado e usam-se
os PNG que já estão versionados — por isso eles ficam no repositório.

    python3 scripts/icones.py
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
IMG = RAIZ / 'assets' / 'img'

VERDE = (79, 89, 49)
CREME = (251, 245, 239)
ROSA = (215, 182, 162)
TINTA = (35, 31, 32)


def rasterizar(svg, lado):
    if not shutil.which('qlmanage'):
        return None
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['qlmanage', '-t', '-s', str(lado), '-o', tmp, str(svg)],
                       capture_output=True)
        saida = Path(tmp) / f'{svg.name}.png'
        if not saida.exists():
            return None
        im = Image.open(saida).convert('RGBA').copy()
    # O Quick Look devolve o SVG sobre BRANCO OPACO, sem canal alfa. Sem retirar
    # esse branco, um logótipo colado sobre fundo creme fica dentro de uma caixa
    # branca — e sobre fundo escuro fica um retângulo branco e mais nada.
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            claro = min(r, g, b)
            if claro > 250:
                px[x, y] = (r, g, b, 0)
            elif claro > 200:
                px[x, y] = (r, g, b, 255 - int((claro - 200) * 255 / 50))
    return im


def icone_toque(marca: str, fundo):
    """Ícone de 180×180 para o ecrã principal do iPhone. Sem transparência: o
    iOS põe fundo preto por baixo do que for transparente."""
    alvo = IMG / f'icone-{marca}-180.png'
    fonte = rasterizar(IMG / f'icone-{marca}.svg', 180)
    if fonte is None:
        print(f'  · {alvo.name}: sem rasterizador, mantém-se o que está')
        return
    tela = Image.new('RGB', (180, 180), fundo)
    tela.paste(fonte, (0, 0), fonte)
    tela.save(alvo, 'PNG', optimize=True)
    print(f'  + {alvo.relative_to(RAIZ)}')


def cartao_partilha():
    """1200×630 para o WhatsApp e o Facebook. É a imagem que aparece quando
    alguém partilha a raiz do sítio, e por isso tem de mostrar as duas marcas."""
    alvo = IMG / 'partilha.jpg'
    tela = Image.new('RGB', (1200, 630), CREME)
    d = ImageDraw.Draw(tela)
    # metade direita no carvão da cathelier: as duas marcas, lado a lado
    d.rectangle([600, 0, 1200, 630], fill=(40, 40, 30))

    ithos = rasterizar(IMG / 'marca' / 'ithos.svg', 560)
    cath = rasterizar(IMG / 'marca' / 'cathelier.svg', 520)
    if ithos is None or cath is None:
        print('  · partilha.jpg: sem rasterizador, mantém-se o que está')
        return

    def encaixar(im, largura):
        r = largura / im.width
        return im.resize((largura, max(1, round(im.height * r))), Image.LANCZOS)

    ithos = encaixar(ithos, 240)
    tela.paste(ithos, (180, (630 - ithos.height) // 2), ithos)

    # O logótipo da cathelier é escuro. Sobre o carvão tem de ir em creme: pinta-se
    # de creme e usa-se a forma original como máscara.
    cath = encaixar(cath, 320)
    claro = Image.new('RGBA', cath.size, (251, 250, 247, 255))
    claro.putalpha(cath.getchannel('A'))
    tela.paste(claro, (740, (630 - cath.height) // 2), claro)

    d.ellipse([90, 120, 150, 180], fill=ROSA)
    d.ellipse([500, 470, 536, 506], fill=VERDE)
    tela.save(alvo, 'JPEG', quality=86, optimize=True)
    print(f'  + {alvo.relative_to(RAIZ)}')


def cartao_cathelier():
    """A cathelier tem casa própria e por isso tem cartão próprio.

    Quando alguém partilha /cathelier/, o cartão das DUAS marcas diz a coisa
    errada — quem recebe o link vem ver lembranças personalizadas, não uma loja
    de candeeiros. O desenho é o da marca: fundo claro, fio, maiúsculas."""
    alvo = IMG / 'partilha-cathelier.jpg'
    tela = Image.new('RGB', (1200, 630), (251, 250, 247))
    d = ImageDraw.Draw(tela)

    cath = rasterizar(IMG / 'marca' / 'cathelier.svg', 640)
    if cath is None:
        print('  · partilha-cathelier.jpg: sem rasterizador, mantém-se o que está')
        return
    r = 420 / cath.width
    cath = cath.resize((420, max(1, round(cath.height * r))), Image.LANCZOS)
    tela.paste(cath, ((1200 - cath.width) // 2, 300 - cath.height // 2), cath)

    # Dois fios finos, a moldura da marca. Não há mais nada: a cathelier é
    # tipografia e espaço, e um cartão cheio deixaria de ser dela.
    d.rectangle([160, 120, 1040, 121], fill=(214, 209, 198))
    d.rectangle([160, 512, 1040, 513], fill=(214, 209, 198))
    d.rectangle([564, 446, 636, 448], fill=VERDE)
    tela.save(alvo, 'JPEG', quality=88, optimize=True)
    print(f'  + {alvo.relative_to(RAIZ)}')


if __name__ == '__main__':
    print('ícones:')
    icone_toque('ithos', VERDE)
    icone_toque('cathelier', (40, 40, 30))
    cartao_partilha()
    cartao_cathelier()
