# Casca instalável do SMARTblocks App (celular e tablet)

Esta pasta vai inteira para o repositório PÚBLICO da casca (GitHub Pages). Não tem dados nem chaves de tarefa:
só baixa as telas publicadas no Apps Script (`baixarApp`) e fala com o `/exec`, como o App do Windows.

- `index.html` + `casca.js`: abre o App; guarda o último pacote no aparelho (abre rápido e sem internet); atualiza quando sai versão nova.
- `manifest.webmanifest` + ícones: ícone na tela, tela cheia, nome "SMARTblocks".
- `sw.js`: guarda só a casca (as chamadas ao /exec nunca passam pelo cache).
- `?app=nova`: abre a versão em teste (fica lembrado no aparelho; `?app=` volta para a da equipe).
- Endereço próprio: arquivo `CNAME` com `app.smartblocks.com.br` (acrescentar quando o registro do domínio existir).
- Teste local: `node tools/teste_local/servidor_casca.js casca` (porta 8767, com o servidor de teste na 8765) e `node tools/teste_local/teste_casca.js tools/teste_local`.
