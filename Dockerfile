# imagem oficial do Bun
FROM oven/bun:latest

# diretório de trabalho dentro do contêiner
WORKDIR /app

# copia apenas os arquivos de dependência primeiro (otimiza o cache do Docker)
COPY package.json bun.lockb* ./

# Instala as dependências
RUN bun install --frozen-lockfile

# Copia o restante do código-fonte para o contêiner
COPY . .

# Define o comando que será executado quando o contêiner iniciar
ENTRYPOINT ["bun"]

# O CMD atua como o argumento padrão caso você não passe nada
CMD ["start"]