<script setup lang="ts">
const jsonUrl = apiUrl('/v1/export.json')
const csvUrl = apiUrl('/v1/export.csv')

const FIELDS: readonly { name: string; meaning: string }[] = [
  { name: 'checkerId', meaning: 'Agência que publicou a checagem.' },
  { name: 'claimText', meaning: 'A alegação, como o checador escreveu.' },
  { name: 'textualRating', meaning: 'A avaliação original do checador, literal.' },
  { name: 'verdict', meaning: 'O carimbo derivado da avaliação pela tabela de normalização.' },
  { name: 'ratingMapVersion', meaning: 'Versão da tabela de normalização usada.' },
  { name: 'reviewDate', meaning: 'Data da checagem; vazio quando o checador não informa.' },
  { name: 'reviewUrl', meaning: 'Link da checagem no site do checador.' },
  { name: 'archivedUrl', meaning: 'Cópia no Internet Archive, quando a fonte é arquivada.' },
  { name: 'sourceUrl', meaning: 'Página ou endpoint de onde o dado bruto foi baixado.' },
  { name: 'fetchedAt', meaning: 'Quando o Carimbo baixou o dado (não é a data da checagem).' },
  {
    name: 'method',
    meaning:
      'Como o dado chegou: factcheck_api (Google), claimreview (marcação na página), html_parser (selo lido da página) ou wayback (cópia arquivada).',
  },
  { name: 'parserVersion', meaning: 'Versão do leitor que extraiu os campos.' },
  {
    name: 'rawSha256',
    meaning: 'Impressão digital (SHA-256) do conteúdo bruto, para conferir que nada foi alterado.',
  },
]

usePageSeo({
  title: 'Dados abertos',
  description:
    'Baixe todas as checagens indexadas pelo Carimbo em JSON ou CSV, com a proveniência de cada registro.',
})
</script>

<template>
  <div class="page prose">
    <h1 class="manchete">Dados abertos</h1>
    <p>
      Todos os registros do Carimbo, para quem quiser refazer as contas. Só campos estruturados e
      links: o texto das checagens fica no site de cada agência.
    </p>
    <p class="downloads">
      <a :href="jsonUrl" class="button button--primary">Baixar JSON</a>
      <a :href="csvUrl" class="button">Baixar CSV</a>
    </p>
    <p class="micro muted">
      Endereços: <code>{{ jsonUrl }}</code> e <code>{{ csvUrl }}</code>
    </p>

    <h2>Campos e proveniência</h2>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Campo</th>
            <th scope="col">O que é</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in FIELDS" :key="field.name">
            <th scope="row">
              <code>{{ field.name }}</code>
            </th>
            <td>{{ field.meaning }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Como usar</h2>
    <ul>
      <li>
        Cite o checador de cada registro e o link da checagem. O veredito é dele, não do Carimbo.
      </li>
      <li>
        Fale em “checagens indexadas pelo Carimbo”: os totais dependem de quem checou e de quanto
        foi coletado. Veja as lacunas em <NuxtLink to="/cobertura">/cobertura</NuxtLink>.
      </li>
      <li>
        Achou um carimbo diferente da avaliação original? Compare <code>textualRating</code> com a
        página em <code>reviewUrl</code> e abra uma issue no
        <a href="https://github.com/Gaalbu" rel="noopener">GitHub</a>.
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page {
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.downloads {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

code {
  font-size: 0.9em;
  overflow-wrap: anywhere;
}
</style>
