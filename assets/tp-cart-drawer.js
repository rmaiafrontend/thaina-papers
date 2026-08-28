/**
 * Gaveta da sacola.
 *
 * O conteúdo é sempre renderizado pelo Liquid — o JS nunca monta item nem
 * formata preço. Depois de qualquer mudança no carrinho ele busca
 * `?sections=tp-cart-drawer` e troca só o miolo, então o <dialog> aberto e o
 * foco continuam de pé.
 */
(function () {
  var SECTION = 'tp-cart-drawer';
  var CLOSE_FALLBACK = 450;

  function drawer() {
    return document.getElementById('tp-cart-drawer');
  }

  function root() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  }

  function open() {
    var el = drawer();
    if (!el) return;
    // A animação de entrada está presa a [open] no CSS, então basta abrir.
    el.classList.remove('is-closing');
    if (!el.open) el.showModal();
    document.documentElement.classList.add('tp-drawer-open');
  }

  function close() {
    var el = drawer();
    if (!el || !el.open || el.classList.contains('is-closing')) return;
    el.classList.add('is-closing');

    var panel = el.querySelector('.tp-drawer__panel');
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.close();
      el.classList.remove('is-closing');
      document.documentElement.classList.remove('tp-drawer-open');
    };

    if (panel) panel.addEventListener('animationend', finish, { once: true });
    // Se a animação não rodar (reduced motion, aba em segundo plano), fecha assim mesmo.
    setTimeout(finish, CLOSE_FALLBACK);
  }

  function syncCount(content) {
    if (!content) return;
    var count = content.getAttribute('data-cart-count');
    if (count === null) return;
    var targets = document.querySelectorAll('[data-tp-cart-count]');
    for (var i = 0; i < targets.length; i++) targets[i].textContent = count;
  }

  function refresh() {
    var el = drawer();
    if (!el) return Promise.resolve();

    return fetch(root() + '?sections=' + SECTION, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Falha ao recarregar a sacola: ' + response.status);
        return response.json();
      })
      .then(function (data) {
        var markup = data[SECTION];
        if (!markup) return;
        var parsed = new DOMParser().parseFromString(markup, 'text/html');
        var fresh = parsed.querySelector('[data-tp-drawer-content]');
        var current = el.querySelector('[data-tp-drawer-content]');
        if (!fresh || !current) return;
        current.replaceWith(fresh);
        syncCount(fresh);
      })
      .catch(function (error) {
        console.warn('[tp-cart-drawer]', error);
      });
  }

  function removeLine(line) {
    return fetch(root() + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ line: line, quantity: 0 }),
    }).then(refresh);
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-tp-cart-open]');
    if (opener) {
      event.preventDefault();
      open();
      refresh();
      return;
    }

    if (event.target.closest('[data-tp-drawer-close]')) {
      event.preventDefault();
      close();
      return;
    }

    var remove = event.target.closest('[data-tp-drawer-remove]');
    if (remove) {
      var line = parseInt(remove.getAttribute('data-line'), 10);
      if (!line) return; // sem a linha, segue o href e recarrega a página
      event.preventDefault();
      removeLine(line);
      return;
    }

    // Clique fora do painel: o alvo é a própria <dialog>, que cobre a viewport.
    if (event.target === drawer()) close();
  });

  // O `cancel` nativo do <dialog> nem sempre chega (depende de como o Esc é
  // entregue à janela), então o atalho também é tratado direto no teclado.
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var el = drawer();
    if (!el || !el.open) return;
    event.preventDefault();
    close();
  });

  // `cancel` e `close` não sobem no DOM, então precisam ser ouvidos na própria
  // <dialog> — que é estável: só o miolo é trocado a cada atualização.
  function bind() {
    var el = drawer();
    if (!el || el.dataset.tpBound) return;
    el.dataset.tpBound = '1';

    // Esc: assumimos o fechamento para a animação de saída rodar.
    el.addEventListener('cancel', function (event) {
      event.preventDefault();
      close();
    });

    // Rede de segurança: qualquer fechamento destrava a rolagem da página.
    el.addEventListener('close', function () {
      el.classList.remove('is-closing');
      document.documentElement.classList.remove('tp-drawer-open');
    });
  }

  bind();

  // Evento padrão da Shopify, disparado pelo formulário de produto do tema.
  // Ele chega antes do POST terminar, então a gaveta abre na hora (a resposta
  // é imediata) mas só recarrega o conteúdo quando a promessa do evento
  // resolve — sem isso o miolo vem do carrinho antigo.
  document.addEventListener('shopify:cart:lines-update', function (event) {
    if (event.action === 'add') open();

    var settled = event.promise || Promise.resolve();
    settled
      .catch(function () {})
      .then(refresh);
  });
})();
