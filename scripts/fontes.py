#!/usr/bin/env python3
"""
Descarrega as tipografias do Google Fonts para ficarem AUTO-ALOJADAS.

Porquê: servir fontes de fonts.gstatic.com faz o browser do visitante contactar um
domínio da Google. Isso é uma transferência de dados para um terceiro, obriga a
nomeá-lo na política de privacidade e, em vários entendimentos, a pedir
consentimento. Auto-alojadas, o site não contacta ninguém — e é por isso que não
precisa de aviso de cookies.

Só se guardam os subconjuntos `latin` e `latin-ext`: o português precisa dos dois.

    python3 scripts/fontes.py
"""
import re
import subprocess
import sys
from pathlib import Path

DEST = Path(__file__).resolve().parent.parent / '_fonte' / 'tipos'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/140.0 Safari/537.36')

# Quatro famílias, uma razão cada:
#   Fraunces   — títulos da ithos. Serifa de estilo antigo, contraste baixo,
#                altura-x grande. Os eixos SOFT e WONK dão-lhe a irregularidade
#                de quem desenha à mão.
#   Marcellus  — títulos da cathelier. Capital romana inscricional: é o único
#                género de letra DESENHADO para se compor em maiúsculas, e
#                aguenta os 17 px onde a Poiret One (toda fio) se desfazia.
#   Figtree    — corpo das duas marcas, com itálico a sério. A Outfit não tinha
#                itálico e a Jost é fechada em parágrafos.
#   Allura     — só o sobrescrito manuscrito da ithos. É o que está no portefólio
#                impresso e nos destaques do Instagram dela: sai a marca com ele.
FAMILIAS = {
    'fraunces': 'Fraunces:opsz,wght,SOFT,WONK@48,400..700,60,1',
    'marcellus': 'Marcellus',
    'figtree': 'Figtree:ital,wght@0,400..700;1,400..600',
    'allura': 'Allura',
}


def curl(url, binario=None):
    cmd = ['curl', '-sS', '-A', UA, url]
    if binario:
        cmd += ['-o', str(binario)]
        subprocess.run(cmd, check=True)
        return None
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    total = 0
    for nome, familia in FAMILIAS.items():
        css = curl(f'https://fonts.googleapis.com/css2?family={familia}&display=swap')
        blocos = re.findall(r'/\*\s*([a-z0-9\-\[\] ]+?)\s*\*/\s*@font-face\s*\{(.*?)\}', css, re.S)
        guardados = []
        for rotulo, corpo in blocos:
            if rotulo not in ('latin', 'latin-ext'):
                continue
            m = re.search(r'url\((https://[^)]+\.woff2)\)', corpo)
            if not m:
                continue
            italico = 'font-style: italic' in corpo
            alvo = DEST / f'{nome}{"-italico" if italico else ""}-{rotulo}.woff2'
            curl(m.group(1), alvo)
            guardados.append(f'{alvo.name} ({alvo.stat().st_size // 1024} KB)')
            total += alvo.stat().st_size
        print(f'{nome:14s} {" · ".join(guardados) if guardados else "!! NADA GUARDADO"}')
    print(f'\ntotal: {total // 1024} KB em {DEST}')


if __name__ == '__main__':
    sys.exit(main())
