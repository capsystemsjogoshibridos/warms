# Emoji Wars

## Rodar local com online real

```bash
npm install
npm start
```

Abra duas abas em:

```text
http://localhost:3000
```

## Deploy com Vercel + Render

A Vercel pode hospedar o frontend, mas nao hospeda um servidor Socket.IO persistente. Para jogar online pela internet, hospede o `server.js` em um host Node, como Render, Railway ou Fly.io.

### 1. Backend no Render

1. Suba este repositorio no GitHub.
2. No Render, crie um novo **Blueprint** ou **Web Service** apontando para este repo.
3. Se usar Blueprint, o Render le o arquivo `render.yaml`.
4. Se criar Web Service manual:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: Node
5. Depois do deploy, copie a URL do Render, por exemplo:

```text
https://emoji-wars-server.onrender.com
```

### 2. Frontend na Vercel

Na Vercel, o projeto pode continuar como site estatico. Depois de criar o backend, edite `config.js`:

```js
window.EMOJI_WARS_CONFIG = {
    socketServerUrl: 'https://emoji-wars-server.onrender.com'
};
```

Troque a URL pelo endereco real do seu backend.

### 3. CORS

O `render.yaml` deixa `CLIENT_ORIGIN="*"` para facilitar testes. Em producao, voce pode trocar por sua URL da Vercel:

```text
https://seu-projeto.vercel.app
```

Se quiser permitir mais de uma origem:

```text
https://seu-projeto.vercel.app,http://localhost:3000
```
