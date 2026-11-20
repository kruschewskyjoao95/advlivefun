# Decisões de compliance do produto

## Escopo deliberado

JurisAdv está validando um mural autenticado. A pessoa autora publica um
resumo minimizado e pode receber contatos de até dois advogados verificados,
em conversas privadas e independentes. A plataforma não presta advocacia,
não indica profissional, não promete resultado e não administra honorários.

## Invariantes

1. A publicação começa privada; somente o resumo autorizado entra no mural.
2. O resumo público não aceita CPF, telefone, número de processo, documentos
   ou identificação de terceiros.
3. Cada publicação admite no máximo dois contatos distintos, inclusive sob
   concorrência, repetição ou abas antigas.
4. A segunda ocupação mantém o cartão com “Limite de contatos atingido”, sem
   ação ou abertura por URL.
5. Retirar uma publicação impede novos contatos, mas não libera vagas ocupadas
   nem apaga conversas existentes.
6. Um advogado acessa somente conversas das quais participa; assinatura,
   verificação ou participação em outra vaga não amplia acesso.
7. A Stripe cobre apenas a mensalidade da plataforma. Nunca recebe, retém,
   divide ou repassa honorários.
8. Texto de caso e conversa não entra em logs, analytics, notificações ou
   metadados de cobrança.
9. O mural e a comunicação comercial permanecem bloqueados para casos reais
   até a revisão jurídica do fluxo completo.

## Obrigações antes do piloto

- Submeter mural, limite de dois contatos, mensalidade e primeira abordagem à
  revisão jurídica escrita.
- Registrar parecer, ajustes e alternativa se o desenho for inviável.
- Implementar autenticação, verificação e suspensão da inscrição OAB.
- Definir controlador, DPO, bases legais, retenção, descarte, backup e resposta
  a incidente.
- Aplicar autorização por objeto e RLS a publicações, conversas e mensagens.
- Tornar checkout, webhook e ocupação de vagas idempotentes.
- Impedir conteúdo sensível em alertas, logs e metadados da Stripe.

## Fontes oficiais

- [Estatuto da Advocacia, art. 34](https://www.planalto.gov.br/ccivil_03/leis/l8906.htm)
- [Código de Ética e Disciplina da OAB](https://www.oab.org.br/Content/pdf/novo-ced.pdf)
- [Provimento nº 205/2021](https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021)
- [Ementa 086/2025/OEP](https://www.oab.org.br/jurisprudencia/detementa/22176)

Estas regras descrevem segurança e desenho planejado; não substituem parecer
jurídico nem revisão da Seccional competente.
