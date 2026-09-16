#!/usr/bin/env python3
"""
Prepara as fotografias para a web.

Porquê existe: as fotografias originais da ithos têm até 3912×5868 px e 4 MB cada.
Servidas assim, uma página de catálogo com 33 produtos são centenas de MB — e quem
compra isto navega no telemóvel.

O que faz: por cada original gera quatro larguras em AVIF **e** em WebP, mais um
cartão de partilha 1200×630 em JPEG por produto.

Porquê os dois formatos: o AVIF é mais pequeno mas mais lento a descodificar em
telemóveis fracos, e é exactamente esse o público. O `<picture>` oferece os dois e
deixa o browser escolher; o `<img>` de base é WebP, que hoje toda a gente lê.

    _fonte/originais/ithos/raposa/01.jpg
      → media/ithos/raposa/01-{400,800,1200,1600}.{avif,webp}
      → media/ithos/raposa/og.jpg           (da fotografia de capa)

INCREMENTAL, e a sério: as derivadas são versionadas no repositório. Um passo que
gera e não guarda refaz tudo a cada publicação — noutro projeto isso custou 197 s
por gravação, e a cliente achou que o site estava avariado.

    python3 scripts/imagens.py
    python3 scripts/imagens.py --forcar     (ignora o que já existe)
"""
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps, features
except ImportError:
    sys.exit('Falta o Pillow:  pip3 install Pillow')

RAIZ = Path(__file__).resolve().parent.parent
ORIGINAIS = RAIZ / '_fonte' / 'originais'
MEDIA = RAIZ / 'media'

LARGURAS = [400, 800, 1200, 1600]
Q_AVIF = 55          # o AVIF aguenta qualidade mais baixa sem se ver
Q_WEBP = 78
EXTENSOES = {'.jpg', '.jpeg', '.png', '.webp'}

# Tecto de peso por largura, em KB. Existe porque a qualidade sozinha não chega:
# as fotografias de ambiente (folhagem, tijolo, cestos de verga) são ruído puro e
# a mesma qualidade que dá 40 KB numa peça sobre fundo liso dá 550 KB nestas. Em
# vez de baixar a qualidade de todas, baixa-se só a das que estouram o orçamento.
TECTO_KB = {400: 60, 800: 140, 1200: 260, 1600: 380}
Q_MINIMO = {'WEBP': 58, 'AVIF': 34}

# 1200×630 é a proporção da pré-visualização grande do WhatsApp e do Facebook, e é
# por WhatsApp que uma loja destas é partilhada. Tem de ser JPEG: nenhum dos dois
# mostra AVIF nem WebP nas pré-visualizações de ligação.
OG_TAM = (1200, 630)

TEM_AVIF = features.check('avif')


def carregar(caminho: Path) -> Image.Image:
    im = Image.open(caminho)
    # Sem isto, as fotografias tiradas na vertical aparecem deitadas: a rotação
    # vive nos metadados EXIF e o Pillow não a aplica sozinho.
    return ImageOps.exif_transpose(im).convert('RGB')


def gravar_sob_tecto(escala: Image.Image, saida: Path, fmt: str, q: int, tecto_kb: int):
    """Grava baixando a qualidade até caber no orçamento, ou até ao mínimo."""
    extra = {'method': 6} if fmt == 'WEBP' else {}
    while True:
        escala.save(saida, fmt, quality=q, **extra)
        if saida.stat().st_size <= tecto_kb * 1024 or q <= Q_MINIMO[fmt]:
            return q
        q -= 6


def derivadas(im: Image.Image, destino: Path, base: str, forcar: bool):
    feitas, apertadas = 0, []
    for w in LARGURAS:
        # Não ampliar: uma fotografia de 700 px gravada a 1600 fica maior em bytes
        # do que o original e não ganha um pixel de nitidez.
        if im.width < w and w != LARGURAS[0]:
            continue
        escala = im.copy()
        if im.width > w:
            escala.thumbnail((w, w * 10), Image.LANCZOS)
        alvos = [(destino / f'{base}-{w}.webp', 'WEBP', Q_WEBP)]
        if TEM_AVIF:
            alvos.append((destino / f'{base}-{w}.avif', 'AVIF', Q_AVIF))
        for saida, fmt, q0 in alvos:
            if saida.exists() and not forcar:
                continue
            q = gravar_sob_tecto(escala, saida, fmt, q0, TECTO_KB[w])
            feitas += 1
            if q < q0:
                apertadas.append(f'{saida.name} q{q0}→q{q} ({saida.stat().st_size // 1024} KB)')
    return feitas, apertadas


def cartao_partilha(capa: Path, destino: Path, forcar: bool) -> bool:
    saida = destino / 'og.jpg'
    if saida.exists() and not forcar:
        return False
    im = carregar(capa)
    corte = ImageOps.fit(im, OG_TAM, Image.LANCZOS, centering=(0.5, 0.42))
    q = 84
    while True:
        corte.save(saida, 'JPEG', quality=q, optimize=True)
        if saida.stat().st_size <= 90 * 1024 or q <= 60:
            return True
        q -= 6



def marca_de_plataforma(f: Path):
    """O ícone de som que o Instagram queima nas fotografias tiradas de vídeos.

    Porquê existe: a única fotografia do caracol — a capa dele, a que ia para a
    montra E para o cartão de partilha do WhatsApp — tinha o altifalante cortado
    do Instagram queimado no canto. Esteve assim uma publicação inteira. Ninguém
    olha para o canto inferior direito de 90 fotografias; um computador olha.

    Procura-se a assinatura do ícone e não «um disco escuro»: posição fixa
    (cerca de 90% da largura, 96% da altura), muitos pixéis escuros juntos, e
    pixéis brancos no meio — que é o altifalante.
    """
    try:
        im = Image.open(f).convert('RGB')
    except Exception:
        return None
    w, h = im.size
    cx, cy, r = int(w * 0.90), int(h * 0.96), max(8, int(w * 0.045))
    caixa = im.crop((max(0, cx - r), max(0, cy - r), min(w, cx + r), min(h, cy + r)))
    px = list(caixa.getdata())
    if not px:
        return None
    escuros = sum(1 for c in px if sum(c) / 3 < 120) / len(px)
    claros = sum(1 for c in px if min(c) > 210) / len(px)
    if escuros > 0.30 and claros > 0.03:
        return f'{escuros:.0%} escuro com {claros:.0%} branco no meio'
    return None


def varrer(forcar=False):
    if not ORIGINAIS.exists():
        print(f'não há {ORIGINAIS.relative_to(RAIZ)} — nada a fazer')
        return
    if not TEM_AVIF:
        print('aviso: este Pillow não tem AVIF; só se geram WebP')

    novas = cartoes = pastas = 0
    orfas = []

    for pasta in sorted(p for p in ORIGINAIS.rglob('*') if p.is_dir()):
        ficheiros = sorted(f for f in pasta.iterdir()
                           if f.is_file() and f.suffix.lower() in EXTENSOES)
        if not ficheiros:
            continue
        destino = MEDIA / pasta.relative_to(ORIGINAIS)
        destino.mkdir(parents=True, exist_ok=True)
        pastas += 1
        for f in ficheiros:
            try:
                im = carregar(f)
            except Exception as e:
                print(f'  !! {f.relative_to(RAIZ)}: {e}')
                continue
            n, apertadas = derivadas(im, destino, f.stem, forcar)
            if n:
                novas += 1
                print(f'  + {f.relative_to(RAIZ)}  ({im.width}×{im.height}, {n} ficheiros)')
                for a in apertadas:
                    print(f'      · {a}')
        # A capa é a PRIMEIRA por ordem de nome, que é a mesma ordem que o gerador
        # usa. Ler de sítios diferentes era o defeito antigo: o cartão de partilha
        # acabava a mostrar outra peça que não a da página.
        if cartao_partilha(ficheiros[0], destino, forcar):
            cartoes += 1

    # Derivadas cujo original desapareceu ficam no repositório a ocupar espaço e,
    # pior, um `srcset` antigo continua a apontar-lhes. Avisa-se; não se apaga
    # sozinho, porque apagar por engano é pior.
    if MEDIA.exists():
        for d in sorted(p for p in MEDIA.rglob('*') if p.is_dir()):
            rel = d.relative_to(MEDIA)
            if not (ORIGINAIS / rel).exists() and any(d.iterdir()):
                orfas.append(str(rel))

    # --- marcas de plataforma -------------------------------------------
    marcadas = []
    for pasta in sorted(p for p in ORIGINAIS.rglob('*') if p.is_dir()):
        for f in sorted(x for x in pasta.iterdir()
                        if x.is_file() and x.suffix.lower() in EXTENSOES):
            porque = marca_de_plataforma(f)
            if porque:
                marcadas.append((f.relative_to(RAIZ), porque))

    print(f'\npastas: {pastas} · originais processados: {novas} · cartões: {cartoes}')
    if orfas:
        print('derivadas sem original (apagar à mão se já não servem):')
        for o in orfas:
            print('  ', o)

    if marcadas:
        print('\nFOTOGRAFIA(S) COM O ÍCONE DO INSTAGRAM QUEIMADO:')
        for f, porque in marcadas:
            print(f'  · {f}  ({porque})')
        print('\nEstas fotografias vieram de um vídeo e trazem o altifalante '
              'cortado no canto.\nCorta a parte de baixo ou pede a original. '
              'A construção não segue assim.')
        sys.exit(1)


if __name__ == '__main__':
    varrer(forcar='--forcar' in sys.argv)
