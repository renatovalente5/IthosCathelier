# ithos · cathelier

Loja das marcas **ithos** (candeeiros de presença em madeira, feitos à mão) e
**cathelier** (peças personalizadas: lembranças, troféus, decoração) —
<https://ithos-cathelier.pt/>

Site estático gerado em Node, sem dependências, publicado no GitHub Pages.

- `_fonte/` — gerador, modelos, estilos, tipos
- `conteudo/` — o que a cliente edita pelo backoffice
- `media/` — fotografias derivadas (AVIF/WebP)
- `publico/` — saída da construção (não versionada)

```bash
node _fonte/build.mjs      # constrói para publico/
```

Backoffice: <https://github.com/renatovalente5/IthosCathelier-Backoffice>
API (Cloudflare Worker): repositório privado `IthosCathelier-API`
