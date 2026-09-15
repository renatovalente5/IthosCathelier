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

FAMILIAS = {
    'bodoni-moda': 'Bodoni+Moda:opsz,wght@6..96,400..700',
    'outfit': 'Outfit:wght@300..700',
    'allura': 'Allura',
    'poiret-one': 'Poiret+One',
    'jost': 'Jost:wght@300..600',
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
            alvo = DEST / f'{nome}-{rotulo}.woff2'
            curl(m.group(1), alvo)
            guardados.append(f'{alvo.name} ({alvo.stat().st_size // 1024} KB)')
            total += alvo.stat().st_size
        print(f'{nome:14s} {" · ".join(guardados) if guardados else "!! NADA GUARDADO"}')
    print(f'\ntotal: {total // 1024} KB em {DEST}')


if __name__ == '__main__':
    sys.exit(main())
