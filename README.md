# JurisAdv

Marketplace jurídico bilateral em validação, com uma camada de compliance
desde a especificação. Uma pessoa publica um resumo minimizado e pode receber
contatos de até dois advogados verificados, em conversas privadas e
independentes.

**Etapa 0 · Especificação — concluída.** A fonte única de produto e arquitetura
está em [`ROADMAP.md`](ROADMAP.md); as decisões detalhadas estão em
[`docs/adr`](docs/adr). As invariantes de conformidade estão em
[`COMPLIANCE.md`](COMPLIANCE.md).

## Estado do projeto

O repositório contém landing page, cadastro nacional de interesse, persistência
PostgreSQL com Drizzle e correção de logging seguro no endpoint de cadastro.
Não existe checkout ou cobrança real; tampouco autenticação, mural,
verificação OAB, mensagens ou saldo de contatos.

A conta Stripe ainda não foi criada. Integração futura depende da conta,
produtos/preços, portal e webhook, além da aprovação jurídica e de privacidade.

## Stack

- Bun
- Next.js e TypeScript
- PostgreSQL e Drizzle ORM
- Stripe como adapter externo futuro
- Zod

## Desenvolvimento local

Instale as dependências:

```bash
bun install
```

Defina `DATABASE_URL` para o PostgreSQL local, aplique as migrações e inicie o
servidor:

```bash
bun run db:push
bun dev
```

## Verificações

```bash
bun test
bun run typecheck
bun run lint
bun run build
```

## Próximas etapas

1. validação assistida, parecer jurídico, privacidade e segurança;
2. identidade com Better Auth, papéis e verificação OAB;
3. publicação minimizada, consentimento, mural e RLS;
4. assinatura, saldo e integração Stripe;
5. contato concorrente, conversas e piloto assistido.

Nenhum caso real pode ser recebido nem a primeira cobrança executada antes dos
gates jurídicos, de privacidade, segurança, concorrência e observabilidade
descritos no roadmap.
