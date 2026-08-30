/**
 * Índice de políticas.
 *
 * O clique no item da esquerda troca só o painel da direita — não navega.
 * Sem JS todos os painéis ficam empilhados, então nada some do ar; a classe
 * .tp-js é o sinal de que o script assumiu e o CSS pode esconder o resto.
 */
(function () {
  function init(root) {
    if (!root || root.dataset.tpBound) return;
    root.dataset.tpBound = '1';
    root.classList.add('tp-js');

    var content = root.querySelector('[data-tp-politicas-content]');
    var tabs = root.querySelectorAll('[data-tp-politica-tab]');
    var panels = root.querySelectorAll('[data-tp-politica-panel]');
    var opened = root.querySelector('.tp-politicas__panel.is-active');
    var defaultKey = opened ? opened.getAttribute('data-tp-politica-panel') : null;

    function activate(key) {
      var found = false;
      for (var i = 0; i < panels.length; i++) {
        var on = panels[i].getAttribute('data-tp-politica-panel') === key;
        panels[i].classList.toggle('is-active', on);
        if (on) found = true;
      }
      if (!found) return false;

      for (var j = 0; j < tabs.length; j++) {
        var selected = tabs[j].getAttribute('data-tp-politica-tab') === key;
        tabs[j].classList.toggle('tp-politicas__index-link--current', selected);
        if (selected) tabs[j].setAttribute('aria-current', 'true');
        else tabs[j].removeAttribute('aria-current');
      }
      return true;
    }

    function keyFromHash() {
      var match = /^#tp-pol-(.+)$/.exec(window.location.hash);
      return match ? decodeURIComponent(match[1]) : null;
    }

    var initial = keyFromHash();
    if (initial) activate(initial);

    root.addEventListener('click', function (event) {
      var link = event.target.closest('[data-tp-politica-tab], a[href^="#tp-pol-"]');
      if (!link) return;

      var key = link.getAttribute('data-tp-politica-tab');
      if (!key) key = decodeURIComponent(link.getAttribute('href').replace('#tp-pol-', ''));
      if (!activate(key)) return;

      // Sem o preventDefault o navegador pularia até o painel. A página fica
      // parada e o histórico é escrito na mão, então o voltar funciona.
      event.preventDefault();
      history.pushState({ tpPolitica: key }, '', '#tp-pol-' + key);

      // Só rola se o conteúdo já tiver saído por cima — caso do mobile, onde
      // o índice fica acima, e dos links dentro do próprio texto.
      if (content && content.getBoundingClientRect().top < 0) {
        content.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    window.addEventListener('popstate', function () {
      activate(keyFromHash() || defaultKey);
    });
  }

  function boot(scope) {
    var roots = (scope || document).querySelectorAll('[data-tp-politicas]');
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  boot();

  // O editor de tema e o servidor de desenvolvimento reinjetam a seção via
  // innerHTML, e aí o markup volta sem passar por nenhum script novo.
  document.addEventListener('shopify:section:load', function (event) {
    boot(event.target);
  });
})();
