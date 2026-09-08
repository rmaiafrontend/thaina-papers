/**
 * Setas de carrossel.
 *
 * Serve qualquer seção que tenha uma faixa [data-tp-faixa] e um par de setas
 * [data-tp-setas] — hoje os trabalhos reais e os depoimentos.
 *
 * A faixa rola sozinha com o dedo e com a roda do mouse; as setas existem
 * para quem está no desktop com mouse comum, onde arrastar não é natural.
 * Por isso elas nascem escondidas no HTML e só aparecem quando há de fato
 * o que rolar — botão que não leva a lugar nenhum é pior que botão nenhum.
 */
(function () {
  function iniciar(faixa) {
    if (!faixa || faixa.dataset.tpBound) return;
    var secao = faixa.closest('section') || document;
    var caixa = secao.querySelector('[data-tp-setas]');
    if (!caixa) return;
    faixa.dataset.tpBound = '1';

    var botoes = caixa.querySelectorAll('[data-tp-seta]');

    function passo() {
      var celula = faixa.firstElementChild;
      if (!celula) return faixa.clientWidth;
      var vao = parseFloat(getComputedStyle(faixa).columnGap) || 0;
      return celula.getBoundingClientRect().width + vao;
    }

    function atualizar() {
      // No celular o CSS esconde as setas; aqui decidimos só pela existência
      // de rolagem, para a faixa curta não ganhar controle inútil.
      var rola = faixa.scrollWidth - faixa.clientWidth > 4;
      caixa.hidden = !rola;
      if (!rola) return;

      var fim = faixa.scrollWidth - faixa.clientWidth;
      for (var i = 0; i < botoes.length; i++) {
        var dir = parseInt(botoes[i].getAttribute('data-tp-seta'), 10);
        botoes[i].disabled = dir < 0 ? faixa.scrollLeft <= 1 : faixa.scrollLeft >= fim - 1;
      }
    }

    caixa.addEventListener('click', function (evento) {
      var botao = evento.target.closest('[data-tp-seta]');
      if (!botao || botao.disabled) return;
      var dir = parseInt(botao.getAttribute('data-tp-seta'), 10);
      faixa.scrollBy({ left: dir * passo(), behavior: 'smooth' });
    });

    faixa.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar);

    // As fotos são lazy: enquanto não carregam, a faixa mede errado.
    var imagens = faixa.querySelectorAll('img');
    for (var j = 0; j < imagens.length; j++) {
      imagens[j].addEventListener('load', atualizar, { once: true });
    }

    atualizar();
  }

  function ligar(escopo) {
    var secoes = (escopo || document).querySelectorAll('[data-tp-faixa]');
    for (var i = 0; i < secoes.length; i++) iniciar(secoes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ligar(); });
  } else {
    ligar();
  }

  // O editor de tema reinjeta a seção via innerHTML e o markup volta cru.
  document.addEventListener('shopify:section:load', function (evento) {
    ligar(evento.target);
  });
})();
