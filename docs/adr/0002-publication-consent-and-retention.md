# ADR 0002: Publicação, consentimento e retenção

- Estado: proposto
- Data: 2026-11-20
- Relação: implementa as decisões de publicação do `ROADMAP.md` e depende do
  ADR 0001 para identidade e autorização

## Contexto

O JurisAdv precisa transformar uma dúvida da pessoa em um cartão legível por
advogados elegíveis sem publicar dados pessoais, sem consultar conteúdo
privado em operações do mural e sem remover a possibilidade de retirada,
auditoria e defesa de direitos.

Um único texto de caso não pode atender simultaneamente:

- prévia pela autora;
- minimização para o público do mural;
- retenção e investigação de incidente;
- contexto privado eventual da conversa;
- exclusão ou retirada;
- observabilidade e auditoria sem conteúdo sigiloso.

O desenho também precisa preservar uma regra estável de presença:

- publicação publicada aparece no mural;
- publicação retirada some do mural;
- conversas já abertas seguem seu ciclo próprio;
- lotação não retira o cartão, apenas elimina suas ações.

## Decisão

### Separação entre rascunho, publicação e conversa

Uma publicação terá estados explícitos:

```text
draft -> published -> withdrawn
  `-> rejected
```

`rejected` representa bloqueio de conteúdo antes da publicação. Ele não cria
um card no mural e não dá acesso a advogados.

Somente o estado `published` pode ser consultado no mural. O estado `withdrawn`
impede novas consultas por URL ou ações de contato, sem apagar conversas
existentes.

O resumo do mural e o conteúdo da conversa são registros separados:

- `public_summary`: texto minimizado confirmado para o mural;
- `conversation message`: texto privado ligado a uma conversa.

Não existirá cópia automática do resumo para uma conversa e não existirá cópia
de conversa para o mural. Nenhuma linha de lista de interesse será
transformada em publicação.

### Interface do módulo `CaseBoard`

O domínio apresentará uma interface pequena:

```text
prepare(author, draft) -> preview
publish(author, publicationId, consent) -> publication
withdraw(author, publicationId) -> withdrawnPublication
listAvailable(verifiedLawyer, filters) -> page
listOwn(author) -> ownPage
```

Essas operações ocultam consentimento, estado, filtro de identificadores,
visibilidade, retenção e RLS. O módulo não aceita identidade, papel ou
verificação fornecidos pelo navegador.

### Prévia sem efeitos de publicação

`prepare` cria ou atualiza um rascunho, produz a representação exata do cartão
e executa detecção local de padrões objetivos. Salvar prévia não:

- publica o caso;
- envia notificação;
- autoriza leitura por advogado;
- cria vaga;
- consome limite de assinatura;
- dá acesso a conteúdo privado.

A prévia informa claramente que números de processo, documentos e dados de
identificação não pertencem ao resumo.

### Bloqueio de identificadores

Antes de publicar, o módulo inspeciona somente conteúdo gerado pelo usuário:

- post/resumo;
- mensagem;
- outros campos livres.

O detector local bloqueia padrões objetivos de:

- CPF;
- telefone;
- e-mail no texto;
- número de processo ou protocolo;
- documento ou referência de arquivo;
- padrão provável de endereço ou identificador pessoal.

O resultado apresenta a categoria detectada, nunca o valor encontrado.
Exemplos de mensagem:

- “CPF não é permitido no resumo público.”
- “Número de processo não é permitido no resumo público.”

O CPF solicitado no onboarding não passa por essa regra, pois pertence a um
campo próprio de verificação e deduplicação. Correção, bloqueio e reenvio não
alteram o consentimento anterior nem publicam automaticamente.

Falsos positivos podem pedir revisão humana interna. A revisão não aprova
orientação jurídica, autenticidade dos fatos ou resultado; ela decide somente
se o texto cumpre o procedimento de minimização definido.

### Consentimento específico

Publicar exige um ato separado de salvar rascunho. O consentimento registra:

- identificador da publicação;
- autora;
- versão e texto do aviso exibido;
- finalidade;
- público elegível: advogados autenticados, verificados e filtrados pela UF
  e categoria da publicação;
- data/hora;
- canal e endereço de versão da política;
- assinatura ou hash dos campos confirmados.

Alterações posteriores no resumo, área, UF, finalidade ou versão do aviso
invalidam o consentimento publicado. O caso volta a `draft` ou exige nova
confirmação explícita antes de voltar ao mural.

Uma checkbox genérica, aceite dos termos ou consentimento dado no cadastro não
autoriza publicação.

### Dados retornados pelo mural

`listAvailable` retorna somente os campos necessários ao cartão:

- ID público;
- área;
- UF;
- resumo público autorizado;
- data de publicação;
- disponibilidade de vagas;
- versão do estado.

A consulta não retorna:

- autora ou CPF;
- e-mail ou contato direto;
- resumo privado;
- rascunho;
- mensagem;
- publicação retirada;
- participantes, advogado ou identidade de outra conversa;
- dados internos de auditoria.

Os cards são ordenados por publicação mais recente. Não existe ranking,
pagamento por destaque, prioridade ou ordenação por plano.

### Retirada

`withdraw` pode ser executada somente pela autora autenticada. A operação:

1. bloqueia a linha e revalida titularidade;
2. muda o estado para `withdrawn`;
3. registra data, versão do procedimento e ator;
4. remove imediatamente a publicação da lista e de consultas por URL;
5. mantém o registro por 30 dias para a autora, revisão e auditoria;
6. bloqueia novas ocupações de vaga;
7. não libera vagas ocupadas nem apaga conversas existentes.

Após 30 dias, resumo e metadados vinculados à publicação são excluídos. Um
evento mínimo de auditoria pode permanecer quando houver base legal aprovada,
sem armazenar o texto do resumo.

### Retenção de conta e conversas

O ADR de publicação não redefine a retenção das mensagens:

- encerramento de conversa bloqueia novos envios;
- participantes mantêm histórico pelo prazo vigente, atualmente 90 dias na
  política de conta/conversas;
- encerramento de conta leva à exclusão ou anonimização após o prazo aprovado
  de 90 dias;
- legal hold preserva dados relevantes por até 180 dias por decisão
  documentada do DPO e permite uma única renovação, total máximo de 360 dias.

Expurgar conteúdo de uma conversa não devolve a vaga da publicação nem
reabre contato.

### Acesso e RLS

A autorização definida pelo ADR 0001 é obrigatória e complementada por RLS:

- autora acessa seus rascunhos, publicações, estado de retirada e
  publicações próprias;
- advogado autenticado e verificado acessa apenas publicações `published`
  elegíveis no mural;
- advogado pendente, reprovado, suspenso ou vencido não acessa o mural;
- cliente sem relação com a publicação não a lista nem a lê;
- acesso administrativo não usa a mesma rota pública e exige papel interno
  explícito;
- cache do mural só existe em contexto autenticado e nunca compartilhado entre
  identidades.

### Moderação e auditoria

Publicar pode gerar somente eventos de auditoria e revisão com metadados,
incluindo:

- `publication.prepared`;
- `publication.published`;
- `publication.withdrawn`;
- `publication.blocked_for_identifier`;
- `publication.review_requested`;
- `publication.review_resolved`.

Esses eventos não duplicam resumo, CPF, mensagem, token ou dados detectados.
Nenhum conteúdo de publicação ou conversa é enviado a API externa de
moderação.

## Consequências

### Positivas

- Resumo público, rascunho e conversa têm finalidades e acessos separados.
- Retirada tem efeito imediato no mural sem destruir conversas existentes.
- Consentimento registra o alcance real e é inválido quando o conteúdo muda.
- RLS e projeção mínima reduzem risco mesmo em erro de consulta.
- O card permanece determinístico e não carrega campos sigilosos para o
  navegador.

### Custos e restrições

- A mudança de um campo relevante exige nova prévia e consentimento.
- O detector local precisa calibrar falsos positivos com revisão humana
  interna.
- RLS e filtros de elegibilidade devem ser testados no banco, não apenas por
  mocks de rota.
- Remoção após 30 dias exige um trabalho de expurgo idempotente e auditado.
- O cache precisa respeitar autenticação, estado e variações de publicação.

## Critérios de aceite

1. Salvar rascunho ou prévia não cria card legível por advogado.
2. Publicar sem consentimento específico ou com versão antiga falha.
3. Alterar resumo, área ou UF invalida o consentimento anterior.
4. Um CPF digitado no onboarding não é bloqueado por essa regra; o mesmo CPF
   no resumo público é bloqueado sem ecoar seu valor.
5. `listAvailable` nunca retorna autora, e-mail, CPF, rascunho, mensagem ou
   participante.
6. Advogado pendente, suspenso ou com OAB vencida recebe negação ao consultar
   mural diretamente no banco e pela rota.
7. Outro cliente não pode listar ou abrir a publicação.
8. Retirar remove o caso do mural e por URL imediatamente, não libera vaga e
   não altera conversa existente.
9. Depois de 30 dias sem legal hold, o resumo da publicação retirada é
   excluído.
10. Nenhum evento ou log de publicação contém o texto, o identificador
    detectado ou dados da conversa.
11. Nenhuma regra de publicitário, ordenação ou plano altera posição no mural.
12. Os testes atravessam a interface de `CaseBoard`; a rota é somente um
    adapter HTTP.

## Alternativas rejeitadas

- **Usar um único campo de caso:** misturaria resumo autorizado, contexto
  privado, consentimento e retenção.
- **Mural público:** ampliaria exposição, indexação e risco sem necessidade
  para o piloto.
- **Aceite genérico de termos:** não prova consentimento para o destinatário
  e finalidade da publicação.
- **Não manter publicação retirada:** impediria retirar conflitos de estado,
  impediria resolver conflitos de estado, demonstrar consentimento e defender
  direitos por um período curto.
- **Retenção indefinida:** viola minimização e cria estado impossível de expurgar.
- **Moderação por API externa:** enviaria conteúdo jurídico potencialmente
  sigiloso a terceiros sem base legal ou necessidade do MVP.
