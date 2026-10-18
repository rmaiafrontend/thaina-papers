/* Catálogo completo da landing: busca, filtros, modal do produto, sacola
   (carrinho real da Shopify via Ajax API) e envio do pedido pelo WhatsApp.
   Sem dependências. */
(function () {
  var raiz = document.querySelector('[data-lp-loja]');
  if (!raiz) return;

  var rotas = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var dados = {};
  try { dados = JSON.parse(document.querySelector('[data-lp-dados]').textContent); } catch (e) {}

  var grade = raiz.querySelector('[data-lp-grade]');
  var cards = Array.prototype.slice.call(grade.querySelectorAll('[data-lp-produto]'));
  var TIPOS = {
    'fisico': 'Impresso',
    'arquivo-digital': 'Arquivo digital',
    'arte-digital': 'Arte digital',
    'template-canva': 'Template Canva'
  };

  var dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function reais(centavos) { return dinheiro.format((centavos || 0) / 100); }

  /* Busca sem acento e sem caixa: "consultorio" acha "Consultórios". */
  function normal(t) {
    return (t || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function textoDe(html) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    return d.textContent || '';
  }

  /* Índice de busca de cada card: título, tipo, coleções, tags e descrição. */
  cards.forEach(function (c) {
    var p = dados[c.getAttribute('data-lp-produto')] || {};
    c._busca = normal([
      c.getAttribute('data-titulo'),
      TIPOS[c.getAttribute('data-tipo')],
      p.colecoes, p.tags, textoDe(p.descricao)
    ].join(' '));
  });

  /* ---------------------------------------------------------------
     Estado dos filtros, espelhado na URL para o link ser compartilhável.
     --------------------------------------------------------------- */
  var estado = { q: '', ocasiao: '', tipos: [], preco: '', ordem: '' };

  /* Lote: quantos cards aparecem por vez. Volta ao primeiro lote sempre
     que a busca ou um filtro muda. */
  var LOTE = window.matchMedia('(min-width: 900px)').matches ? 12 : 8;
  var limite = LOTE;
  var assinatura = '';
  var params = new URLSearchParams(location.search);
  estado.q = params.get('q') || '';
  estado.ocasiao = params.get('ocasiao') || '';
  estado.tipos = (params.get('tipo') || '').split(',').filter(Boolean);
  estado.preco = params.get('preco') || '';
  estado.ordem = params.get('ordem') || '';

  var busca = raiz.querySelector('[data-lp-busca]');
  var buscaLimpar = raiz.querySelector('[data-lp-busca-limpar]');
  var pilulas = Array.prototype.slice.call(raiz.querySelectorAll('[data-lp-ocasiao]'));
  var conta = raiz.querySelector('[data-lp-conta]');
  var limpar = raiz.querySelector('[data-lp-limpar]');
  var vazio = raiz.querySelector('[data-lp-vazio]');
  var seloFiltros = raiz.querySelector('[data-lp-filtros-conta]');
  var mais = raiz.querySelector('[data-lp-mais]');
  var maisInfo = raiz.querySelector('[data-lp-mais-info]');
  var maisBarra = raiz.querySelector('[data-lp-mais-barra]');
  var carregar = raiz.querySelector('[data-lp-carregar]');
  var verTodos = raiz.querySelector('[data-lp-ver-todos]');
  var gavetaFiltros = document.querySelector('[data-lp-filtros]');

  /* Ocasião vinda da landing pelo nome ("consultorios") e não pelo handle
     da coleção: aceita os dois. */
  function resolverOcasiao(v) {
    if (!v) return '';
    if (pilulas.some(function (b) { return b.getAttribute('data-lp-ocasiao') === v; })) return v;
    var porNome = pilulas.find(function (b) { return normal(b.textContent).replace(/\s+/g, '-') === normal(v); });
    return porNome ? porNome.getAttribute('data-lp-ocasiao') : '';
  }
  estado.ocasiao = resolverOcasiao(estado.ocasiao);

  function casa(c) {
    if (estado.ocasiao && c.getAttribute('data-colecoes').indexOf(',' + estado.ocasiao + ',') === -1) return false;
    if (estado.tipos.length && estado.tipos.indexOf(c.getAttribute('data-tipo')) === -1) return false;
    if (estado.preco) {
      var faixa = estado.preco.split('-');
      var preco = parseInt(c.getAttribute('data-preco'), 10);
      if (faixa[0] && preco < parseInt(faixa[0], 10)) return false;
      if (faixa[1] && preco > parseInt(faixa[1], 10)) return false;
    }
    if (estado.q) {
      var termos = normal(estado.q).split(/\s+/).filter(Boolean);
      for (var i = 0; i < termos.length; i++) if (c._busca.indexOf(termos[i]) === -1) return false;
    }
    return true;
  }

  function ordenar(lista) {
    var num = function (c, a) { return parseInt(c.getAttribute(a), 10); };
    return lista.slice().sort(function (a, b) {
      if (estado.ordem === 'menor') return num(a, 'data-preco') - num(b, 'data-preco');
      if (estado.ordem === 'maior') return num(b, 'data-preco') - num(a, 'data-preco');
      if (estado.ordem === 'az') return a.getAttribute('data-titulo').localeCompare(b.getAttribute('data-titulo'), 'pt-BR');
      return num(a, 'data-ordem') - num(b, 'data-ordem');
    });
  }

  function aplicar(maisUmLote) {
    var chave = JSON.stringify([estado.q, estado.ocasiao, estado.tipos, estado.preco, estado.ordem]);
    if (chave !== assinatura) { limite = LOTE; assinatura = chave; }

    var visiveis = 0;
    var mostrados = 0;
    ordenar(cards).forEach(function (c) {
      var ok = casa(c);
      var dentro = ok && visiveis < limite;
      if (ok) visiveis++;
      var eraOculto = c.hidden;
      c.hidden = !dentro;
      if (dentro) {
        mostrados++;
        c.classList.add('is-in');
        /* Os que chegam com "carregar mais" entram com uma animação curta. */
        c.classList.toggle('is-novo', !!maisUmLote && eraOculto);
      }
      grade.appendChild(c);
    });

    mais.hidden = visiveis <= mostrados;
    maisInfo.textContent = 'Mostrando ' + mostrados + ' de ' + visiveis + ' modelos';
    maisBarra.style.width = (visiveis ? (mostrados / visiveis) * 100 : 0) + '%';
    var restantes = visiveis - mostrados;
    var proximo = Math.min(LOTE, restantes);
    carregar.textContent = 'Carregar mais ' + proximo + (proximo === 1 ? ' modelo' : ' modelos');
    verTodos.hidden = restantes <= LOTE;

    conta.textContent = visiveis + (visiveis === 1 ? ' modelo' : ' modelos');
    vazio.hidden = visiveis > 0;
    grade.hidden = visiveis === 0;

    var extras = estado.tipos.length + (estado.preco ? 1 : 0) + (estado.ordem ? 1 : 0);
    seloFiltros.textContent = extras;
    seloFiltros.hidden = extras === 0;
    limpar.hidden = !(estado.q || estado.ocasiao || extras);
    buscaLimpar.hidden = !estado.q;

    pilulas.forEach(function (b) {
      var ativa = b.getAttribute('data-lp-ocasiao') === estado.ocasiao;
      b.setAttribute('aria-pressed', ativa ? 'true' : 'false');
      /* A faixa de pílulas rola (só na horizontal) até a ativa — vale também
         quando o filtro vem de um atalho ou da URL. */
      if (ativa && b.parentElement) {
        var faixa = b.parentElement;
        faixa.scrollTo({ left: b.offsetLeft - (faixa.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      }
    });

    /* URL: só os filtros ativos; o produto aberto (p) é cuidado pelo modal. */
    var u = new URLSearchParams(location.search);
    ['q', 'ocasiao', 'tipo', 'preco', 'ordem'].forEach(function (k) { u.delete(k); });
    if (estado.q) u.set('q', estado.q);
    if (estado.ocasiao) u.set('ocasiao', estado.ocasiao);
    if (estado.tipos.length) u.set('tipo', estado.tipos.join(','));
    if (estado.preco) u.set('preco', estado.preco);
    if (estado.ordem) u.set('ordem', estado.ordem);
    history.replaceState(history.state, '', location.pathname + '?' + u.toString());
  }

  function sincronizarGaveta() {
    gavetaFiltros.querySelectorAll('input[name="tipo"]').forEach(function (i) { i.checked = estado.tipos.indexOf(i.value) > -1; });
    gavetaFiltros.querySelectorAll('input[name="preco"]').forEach(function (i) { i.checked = i.value === estado.preco; });
    gavetaFiltros.querySelectorAll('input[name="ordem"]').forEach(function (i) { i.checked = i.value === estado.ordem; });
  }

  busca.value = estado.q;
  var espera;
  busca.addEventListener('input', function () {
    clearTimeout(espera);
    espera = setTimeout(function () { estado.q = busca.value.trim(); aplicar(); }, 120);
  });
  buscaLimpar.addEventListener('click', function () { busca.value = ''; estado.q = ''; aplicar(); busca.focus(); });

  pilulas.forEach(function (b) {
    b.addEventListener('click', function () {
      estado.ocasiao = b.getAttribute('data-lp-ocasiao');
      aplicar();
    });
  });

  gavetaFiltros.addEventListener('change', function () {
    estado.tipos = Array.prototype.map.call(gavetaFiltros.querySelectorAll('input[name="tipo"]:checked'), function (i) { return i.value; });
    estado.preco = (gavetaFiltros.querySelector('input[name="preco"]:checked') || {}).value || '';
    estado.ordem = (gavetaFiltros.querySelector('input[name="ordem"]:checked') || {}).value || '';
    aplicar();
    gavetaFiltros.querySelector('[data-lp-filtros-ver]').textContent = 'Ver ' + conta.textContent;
  });

  gavetaFiltros.querySelector('[data-lp-filtros-limpar]').addEventListener('click', function () {
    estado.tipos = []; estado.preco = ''; estado.ordem = '';
    sincronizarGaveta(); aplicar();
    gavetaFiltros.querySelector('[data-lp-filtros-ver]').textContent = 'Ver ' + conta.textContent;
  });

  carregar.addEventListener('click', function () {
    limite += LOTE;
    aplicar(true);
  });

  verTodos.addEventListener('click', function () {
    limite = Infinity;
    aplicar(true);
  });

  limpar.addEventListener('click', function () {
    estado = { q: '', ocasiao: '', tipos: [], preco: '', ordem: '' };
    busca.value = '';
    sincronizarGaveta(); aplicar();
  });

  raiz.querySelector('[data-lp-abrir-filtros]').addEventListener('click', function () {
    sincronizarGaveta();
    gavetaFiltros.querySelector('[data-lp-filtros-ver]').textContent = 'Ver ' + conta.textContent;
    abrir(gavetaFiltros);
  });

  /* ---------------------------------------------------------------
     Gavetas (<dialog>): fecham no ×, no Esc (nativo) e tocando fora.
     --------------------------------------------------------------- */
  function abrir(d) {
    if (d.open) return;
    d.showModal();
    document.documentElement.classList.add('lp-trava');
  }

  function fechar(d) {
    if (!d.open) return;
    d.classList.add('is-saindo');
    setTimeout(function () { d.classList.remove('is-saindo'); d.close(); }, 220);
  }

  document.querySelectorAll('dialog.lp-gaveta').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-lp-fechar]')) { e.preventDefault(); fechar(d); }
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); fechar(d); });
    d.addEventListener('close', function () {
      if (!document.querySelector('dialog.lp-gaveta[open]')) document.documentElement.classList.remove('lp-trava');
      if (d === modal) limparProdutoDaUrl();
    });
  });

  /* ---------------------------------------------------------------
     Modal do produto
     --------------------------------------------------------------- */
  var modal = document.querySelector('[data-lp-modal]');
  var form = modal.querySelector('[data-lp-form]');
  var fotos = modal.querySelector('[data-lp-fotos]');
  var marcas = modal.querySelector('[data-lp-fotos-marcas]');
  var qtd = modal.querySelector('[data-lp-qtd-valor]');
  var detalhes = modal.querySelector('[data-lp-detalhes]');
  var erro = modal.querySelector('[data-lp-erro]');
  var btnAdd = modal.querySelector('[data-lp-add]');
  var atual = null;
  var varianteAtual = null;

  function precoAtual() {
    return (varianteAtual ? varianteAtual.preco : 0) * Math.max(1, parseInt(qtd.value, 10) || 1);
  }

  function atualizarPreco() {
    modal.querySelector('[data-lp-modal-preco]').textContent = reais(varianteAtual ? varianteAtual.preco : 0);
    modal.querySelector('[data-lp-add-preco]').textContent = reais(precoAtual());
    var indisponivel = varianteAtual && !varianteAtual.disponivel;
    btnAdd.disabled = !!indisponivel;
    if (indisponivel) modal.querySelector('[data-lp-add-preco]').textContent = 'indisponível';
  }

  function abrirProduto(handle, semHistorico) {
    var p = dados[handle];
    if (!p) return;
    atual = { handle: handle, p: p };
    erro.hidden = true;
    qtd.value = 1;
    detalhes.value = '';

    /* Fotos: carrossel por scroll-snap; sem foto, a inicial sobre vinho. */
    fotos.innerHTML = '';
    marcas.innerHTML = '';
    if (p.fotos && p.fotos.length) {
      p.fotos.forEach(function (src, i) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = i === 0 ? p.titulo : '';
        img.loading = i === 0 ? 'eager' : 'lazy';
        fotos.appendChild(img);
        if (p.fotos.length > 1) {
          var m = document.createElement('span');
          if (i === 0) m.className = 'is-ativo';
          marcas.appendChild(m);
        }
      });
    } else {
      var ini = document.createElement('div');
      ini.className = 'lp-produto__inicial';
      ini.textContent = p.titulo.charAt(0);
      fotos.appendChild(ini);
    }
    fotos.scrollLeft = 0;

    modal.querySelector('[data-lp-modal-tipo]').textContent = TIPOS[p.tipo] || '';
    modal.querySelector('[data-lp-modal-titulo]').textContent = p.titulo;
    modal.querySelector('[data-lp-modal-descricao]').innerHTML = p.descricao || '';

    /* Variações: só aparece quando há mais de uma. */
    var caixa = modal.querySelector('[data-lp-variantes]');
    var lista = modal.querySelector('[data-lp-variantes-lista]');
    lista.innerHTML = '';
    var variantes = p.variantes || [];
    varianteAtual = variantes.find(function (v) { return v.disponivel; }) || variantes[0] || null;
    if (variantes.length > 1) {
      modal.querySelector('[data-lp-variantes-rotulo]').textContent = (p.opcoes || []).join(' / ') || 'Opção';
      variantes.forEach(function (v) {
        var l = document.createElement('label');
        l.className = 'lp-chip';
        l.innerHTML = '<input type="radio" name="variante"><span></span>';
        l.querySelector('span').textContent = v.titulo;
        var input = l.querySelector('input');
        input.value = v.id;
        input.checked = v === varianteAtual;
        input.disabled = !v.disponivel;
        input.addEventListener('change', function () { varianteAtual = v; atualizarPreco(); });
        lista.appendChild(l);
      });
      caixa.hidden = false;
    } else {
      caixa.hidden = true;
    }

    atualizarPreco();
    abrir(modal);
    /* Abre sempre no topo (foto), mesmo depois de o foco ou o carregamento
       da imagem mexerem na rolagem da folha. */
    var folha = modal.querySelector('.lp-gaveta__papel');
    folha.scrollTop = 0;
    modal.querySelector('[data-lp-fechar]').focus({ preventScroll: true });
    requestAnimationFrame(function () { folha.scrollTop = 0; });

    if (!semHistorico) {
      var u = new URLSearchParams(location.search);
      u.set('p', handle);
      history.replaceState(history.state, '', location.pathname + '?' + u.toString());
    }
  }

  function limparProdutoDaUrl() {
    var u = new URLSearchParams(location.search);
    if (!u.has('p')) return;
    u.delete('p');
    history.replaceState(history.state, '', location.pathname + '?' + u.toString());
  }

  fotos.addEventListener('scroll', function () {
    var i = Math.round(fotos.scrollLeft / fotos.clientWidth);
    Array.prototype.forEach.call(marcas.children, function (m, j) { m.classList.toggle('is-ativo', j === i); });
  }, { passive: true });

  modal.querySelectorAll('[data-lp-qtd]').forEach(function (b) {
    b.addEventListener('click', function () {
      qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) + parseInt(b.getAttribute('data-lp-qtd'), 10));
      atualizarPreco();
    });
  });
  qtd.addEventListener('input', atualizarPreco);

  /* O card inteiro abre o modal; o botão "+" é o caminho pelo teclado. */
  grade.addEventListener('click', function (e) {
    var card = e.target.closest('[data-lp-produto]');
    if (card) abrirProduto(card.getAttribute('data-lp-produto'));
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!varianteAtual) return;
    var item = { id: varianteAtual.id, quantity: Math.max(1, parseInt(qtd.value, 10) || 1) };
    var det = detalhes.value.trim();
    if (det) item.properties = { 'Detalhes': det };

    btnAdd.disabled = true;
    btnAdd.classList.add('is-carregando');
    erro.hidden = true;

    fetch(rotas + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [item] })
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
      .then(function () {
        fechar(modal);
        avisar('Adicionado à sacola');
        return carregarSacola(true);
      })
      .catch(function (j) {
        erro.textContent = (j && (j.description || j.message)) || 'Não deu para adicionar agora. Tente de novo.';
        erro.hidden = false;
      })
      .then(function () {
        btnAdd.disabled = false;
        btnAdd.classList.remove('is-carregando');
      });
  });

  /* ---------------------------------------------------------------
     Sacola: lê /cart.js e mantém barra + gaveta em dia.
     --------------------------------------------------------------- */
  var sacola = document.querySelector('[data-lp-sacola]');
  var barra = document.querySelector('[data-lp-abrir-sacola]');
  var carrinho = null;
  var nome = sacola.querySelector('[data-lp-nome]');
  var dataEvento = sacola.querySelector('[data-lp-data]');

  /* Data pelo calendário nativo (input date): o valor é AAAA-MM-DD, e não
     faz sentido marcar evento no passado. Só reaproveita do navegador o
     que estiver nesse formato (versões antigas guardavam texto livre). */
  var hoje = new Date();
  dataEvento.min = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  try {
    nome.value = localStorage.getItem('lp-nome') || '';
    var guardada = localStorage.getItem('lp-data') || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(guardada)) dataEvento.value = guardada;
  } catch (e) {}

  function dataBR(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  nome.addEventListener('input', function () { try { localStorage.setItem('lp-nome', nome.value); } catch (e) {} });
  dataEvento.addEventListener('change', function () { try { localStorage.setItem('lp-data', dataEvento.value); } catch (e) {} });
  dataEvento.addEventListener('input', function () { try { localStorage.setItem('lp-data', dataEvento.value); } catch (e) {} });

  function carregarSacola(pulsar) {
    return fetch(rotas + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (c) { carrinho = c; desenharSacola(pulsar); })
      .catch(function () {});
  }

  function desenharSacola(pulsar) {
    var c = carrinho || { items: [], item_count: 0, total_price: 0 };
    barra.hidden = c.item_count === 0;
    document.documentElement.classList.toggle('lp-com-sacola', c.item_count > 0);
    barra.querySelector('[data-lp-barra-conta]').textContent = c.item_count;
    barra.querySelector('[data-lp-barra-total]').textContent = reais(c.total_price);
    if (pulsar) {
      barra.classList.remove('is-pulsando');
      void barra.offsetWidth;
      barra.classList.add('is-pulsando');
    }

    var lista = sacola.querySelector('[data-lp-sacola-itens]');
    lista.innerHTML = '';
    c.items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'lp-sacola__item';
      var img = it.image ? '<img src="' + it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=160" alt="" loading="lazy">' : '<span class="lp-sacola__inicial">' + escapar(it.product_title.charAt(0)) + '</span>';
      var variante = it.variant_title && it.variant_title !== 'Default Title' ? '<span class="lp-sacola__variante">' + escapar(it.variant_title) + '</span>' : '';
      var det = it.properties && it.properties.Detalhes ? '<span class="lp-sacola__detalhes">' + escapar(it.properties.Detalhes) + '</span>' : '';
      li.innerHTML =
        '<div class="lp-sacola__foto">' + img + '</div>' +
        '<div class="lp-sacola__info">' +
          '<span class="lp-sacola__nome">' + escapar(it.product_title) + '</span>' + variante + det +
          '<div class="lp-sacola__linha">' +
            '<div class="lp-qtd lp-qtd--mini">' +
              '<button type="button" data-lp-item-qtd="-1" aria-label="Diminuir">−</button>' +
              '<span>' + it.quantity + '</span>' +
              '<button type="button" data-lp-item-qtd="1" aria-label="Aumentar">+</button>' +
            '</div>' +
            '<strong>' + reais(it.final_line_price) + '</strong>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="lp-sacola__remover" data-lp-item-remover aria-label="Remover ' + escapar(it.product_title) + '">×</button>';
      li._chave = it.key;
      li._qtd = it.quantity;
      lista.appendChild(li);
    });

    sacola.querySelector('[data-lp-sacola-vazia]').hidden = c.item_count > 0;
    sacola.querySelector('[data-lp-sacola-resumo]').hidden = c.item_count === 0;
    sacola.querySelector('[data-lp-sacola-total]').textContent = reais(c.total_price);
  }

  function escapar(t) {
    return (t || '').toString().replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function mudarItem(chave, quantidade) {
    sacola.classList.add('is-carregando');
    return fetch(rotas + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: chave, quantity: quantidade })
    })
      .then(function (r) { return r.json(); })
      .then(function (c) { carrinho = c; desenharSacola(false); })
      .catch(function () { avisar('Não deu para atualizar a sacola.'); })
      .then(function () { sacola.classList.remove('is-carregando'); });
  }

  sacola.addEventListener('click', function (e) {
    var li = e.target.closest('.lp-sacola__item');
    if (li && e.target.closest('[data-lp-item-qtd]')) {
      mudarItem(li._chave, Math.max(0, li._qtd + parseInt(e.target.closest('[data-lp-item-qtd]').getAttribute('data-lp-item-qtd'), 10)));
    } else if (li && e.target.closest('[data-lp-item-remover]')) {
      mudarItem(li._chave, 0);
    }
  });

  sacola.querySelector('[data-lp-esvaziar]').addEventListener('click', function () {
    fetch(rotas + 'cart/clear.js', { method: 'POST', headers: { Accept: 'application/json' } })
      .then(function () { return carregarSacola(false); });
  });

  barra.addEventListener('click', function () { abrir(sacola); });

  /* ---------------------------------------------------------------
     Pedido pelo WhatsApp: resumo em texto com itens, detalhes e total.
     --------------------------------------------------------------- */
  sacola.querySelector('[data-lp-enviar]').addEventListener('click', function () {
    var c = carrinho;
    if (!c || !c.item_count) return;
    var linhas = ['Olá, Thainá! Montei este pedido pelo site:', ''];
    c.items.forEach(function (it, i) {
      var v = it.variant_title && it.variant_title !== 'Default Title' ? ' (' + it.variant_title + ')' : '';
      linhas.push((i + 1) + '. ' + it.product_title + v);
      linhas.push('   ' + it.quantity + ' × ' + reais(it.final_price) + ' = ' + reais(it.final_line_price));
      if (it.properties && it.properties.Detalhes) linhas.push('   Detalhes: ' + it.properties.Detalhes);
    });
    linhas.push('');
    linhas.push('Total estimado: ' + reais(c.total_price));
    if (nome.value.trim()) linhas.push('Nome: ' + nome.value.trim());
    if (dataBR(dataEvento.value)) linhas.push('Data do evento: ' + dataBR(dataEvento.value));
    linhas.push('');
    linhas.push('Pode me passar frete e prazo?');

    var numero = (raiz.getAttribute('data-whatsapp') || '').replace(/\D/g, '');
    window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(linhas.join('\n')), '_blank', 'noopener');
  });

  /* ---------------------------------------------------------------
     Aviso rápido ("Adicionado à sacola")
     --------------------------------------------------------------- */
  var aviso = document.querySelector('[data-lp-aviso]');
  var avisoTimer;
  function avisar(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
    aviso.classList.remove('is-saindo');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () {
      aviso.classList.add('is-saindo');
      setTimeout(function () { aviso.hidden = true; }, 300);
    }, 1800);
  }

  /* Atalhos de outras seções da página (ex.: "Ver modelos" das ocasiões
     na landing): filtram e rolam até o catálogo. */
  document.addEventListener('lp:ocasiao', function (e) {
    estado.ocasiao = resolverOcasiao(e.detail);
    aplicar();
    raiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------------
     Início
     --------------------------------------------------------------- */
  sincronizarGaveta();
  aplicar();
  carregarSacola(false);
  var inicial = new URLSearchParams(location.search).get('p');
  if (inicial && dados[inicial]) abrirProduto(inicial, true);
})();
