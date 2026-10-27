<script setup lang="ts">
import type { Verdict } from '@carimbo/core'

// Mirrors packages/core/src/normalize-rating.ts (RATING_MAP_VERSION 1). The web app imports only
// types from @carimbo/core, so the table is kept here as text; update both together.
const RATING_MAP_VERSION = 1
const NORMALIZATION: readonly { verdict: Verdict; ratings: string }[] = [
  { verdict: 'false', ratings: 'falso, falsa, fake, montagem, inventado, inventada' },
  {
    verdict: 'out_of_context',
    ratings:
      'enganoso, enganosa, sem contexto, fora de contexto, distorcido, distorcida, exagerado, exagerada, impreciso, imprecisa',
  },
  { verdict: 'true', ratings: 'verdadeiro, verdadeira, verdade, correto, correta' },
  {
    verdict: 'unknown',
    ratings:
      'qualquer outra avaliação (subestimado, contraditório, insustentável, “ainda é cedo para dizer”…)',
  },
]

usePageSeo({
  title: 'Como funciona',
  description:
    'De onde vêm as checagens do Carimbo, como as avaliações viram carimbos e o que o Carimbo não faz.',
})
</script>

<template>
  <div class="page prose">
    <h1 class="manchete">Como funciona</h1>
    <p>
      O Carimbo junta, numa tela só, checagens de fatos já publicadas por agências brasileiras. Quem
      recebeu uma mensagem no WhatsApp cola o texto na busca e vê o veredito de quem checou, com o
      link da checagem completa.
    </p>

    <h2>De onde vêm as checagens</h2>
    <ul>
      <li>
        <strong>Google Fact Check Tools</strong>, que reúne as marcações ClaimReview publicadas
        pelos checadores.
      </li>
      <li>
        <strong>As próprias páginas dos checadores</strong>: o Carimbo lê o RSS de cada agência e
        extrai a marcação ClaimReview da página da checagem.
      </li>
      <li>
        <strong>Arquivo de cada checador</strong> (sitemap e listagens por data), para checagens
        antigas.
      </li>
      <li>
        <strong>Internet Archive (Wayback Machine)</strong>, quando a página original saiu do ar.
        Nesse caso o card diz “fonte arquivada em DD/MM/AAAA” e aponta para a cópia arquivada.
      </li>
    </ul>
    <p>
      Cada registro guarda de onde veio (<code>sourceUrl</code>), quando foi coletado
      (<code>fetchedAt</code>), por qual método (<code>method</code>), com qual versão do leitor
      (<code>parserVersion</code>) e a impressão digital do conteúdo original
      (<code>rawSha256</code>). Registro sem esses dados não entra.
    </p>

    <h2>Como uma avaliação vira carimbo</h2>
    <p>
      Cada agência usa o próprio vocabulário. O Carimbo guarda a avaliação original, sempre visível
      embaixo do carimbo (“Aos Fatos: enganoso”), e a traduz para um de quatro carimbos por uma
      tabela fixa. A comparação ignora acentos, maiúsculas e pontuação, e considera só o rótulo
      antes de dois-pontos.
    </p>
    <div class="table-wrap">
      <table class="table">
        <caption class="visually-hidden">
          Tabela de normalização das avaliações, versão
          {{
            RATING_MAP_VERSION
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Carimbo</th>
            <th scope="col">Avaliações originais</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in NORMALIZATION" :key="row.verdict">
            <th scope="row"><Stamp :verdict="row.verdict" size="sm" :animate="false" /></th>
            <td>{{ row.ratings }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="micro muted">Versão {{ RATING_MAP_VERSION }} da tabela de normalização.</p>
    <p>
      Avaliação que não está na tabela vira <strong>veja a checagem</strong>, nunca um palpite. Ela
      é registrada para que alguém decida, com calma, se entra na tabela.
    </p>

    <h2>Regras</h2>
    <ol>
      <li>
        <strong>Sem veredito próprio.</strong> Todo carimbo vem de um checador, com nome e link. O
        Carimbo nunca muda uma avaliação.
      </li>
      <li>
        <strong>Veredito copiado, nunca deduzido.</strong> A avaliação vem literalmente da marcação
        do checador ou do selo impresso na página. Sem inteligência artificial, sem classificador,
        sem “parece falso pelo título”. Se não deu para extrair, o carimbo é “veja a checagem”.
      </li>
      <li>
        <strong>Vereditos diferentes nunca se fundem.</strong> Quando várias agências checaram a
        mesma alegação, o carimbo de cada uma aparece lado a lado.
      </li>
      <li>
        <strong>Neutralidade.</strong> Não existe ranking de “quem mais mente”. Pessoas citadas
        aparecem como informação, não como placar.
      </li>
      <li>
        <strong>Direito autoral.</strong> O Carimbo publica só os campos estruturados (alegação,
        avaliação, título, data, agência) e o link. Nada do texto da checagem é copiado.
      </li>
      <li>
        <strong>Dado ausente é dado ausente.</strong> Sem data informada pelo checador, aparece
        “data não informada”, nunca a data em que o Carimbo coletou.
      </li>
      <li>
        <strong>Lacuna é lacuna.</strong> Checador sem dado num ano aparece como “sem cobertura”,
        nunca como zero. Nenhum número é estimado.
      </li>
      <li>
        <strong>Contagem com o nome certo.</strong> Os números são sempre de “checagens indexadas
        pelo Carimbo”. Eles dependem de quem checou e de quanto foi coletado, e não medem quanta
        mentira circulou.
      </li>
      <li>
        <strong>Histórico de revisão.</strong> Se o checador mudar a avaliação, as duas ficam
        guardadas.
      </li>
      <li>
        <strong>Auditoria por amostra.</strong> A cada coleta de arquivo antigo, uma amostra é
        conferida à mão contra a página original. Erro de veredito bloqueia a publicação do lote.
      </li>
      <li>
        <strong>Acessibilidade.</strong> O carimbo sempre traz a palavra, nunca só a cor, e a
        animação de carimbar desliga quando o sistema pede menos movimento.
      </li>
    </ol>

    <h2>O que o Carimbo não faz</h2>
    <ul>
      <li>Não checa nada nem decide o que é verdade.</li>
      <li>Não usa inteligência artificial para classificar alegações.</li>
      <li>Não copia o texto das checagens: para ler a análise, siga o link do checador.</li>
      <li>Não tem chat, comentários nem anúncios.</li>
      <li>Não rastreia quem visita: não há cookie de identificação.</li>
    </ul>

    <h2>Para conferir</h2>
    <p>
      Veja a <NuxtLink to="/cobertura">cobertura por checador e ano</NuxtLink>, a
      <NuxtLink to="/fontes">lista de checadores</NuxtLink> e os
      <NuxtLink to="/dados">dados abertos</NuxtLink>, com a proveniência de cada registro.
    </p>
  </div>
</template>

<style scoped>
.page {
  margin: 0 auto;
  padding: 24px 16px 40px;
}

code {
  font-size: 0.9em;
}
</style>
