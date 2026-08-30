/**
 * Modal do briefing.
 *
 * Qualquer link para #briefing abre o formulário por cima da página em vez
 * de navegar. Sem JS o link continua valendo: leva à página tailor-made,
 * onde o mesmo briefing está no corpo do texto.
 */
(function () {
  var CLOSE_FALLBACK = 400;

  function modal() {
    return document.getElementById('tp-briefing');
  }

  function open() {
    var el = modal();
    if (!el || el.open) return;
    el.classList.remove('is-closing');
    el.showModal();
    document.documentElement.classList.add('tp-briefing-open');
  }

  function close() {
    var el = modal();
    if (!el || !el.open || el.classList.contains('is-closing')) return;
    el.classList.add('is-closing');

    var panel = el.querySelector('.tp-briefing__panel');
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.close();
      el.classList.remove('is-closing');
      document.documentElement.classList.remove('tp-briefing-open');
    };

    if (panel) panel.addEventListener('animationend', finish, { once: true });
    // Se a animação não rodar (reduced motion, aba em segundo plano), fecha assim mesmo.
    setTimeout(finish, CLOSE_FALLBACK);
  }

  document.addEventListener('click', function (event) {
    if (!modal()) return;

    if (event.target.closest('[data-tp-briefing-close]')) {
      event.preventDefault();
      close();
      return;
    }

    var trigger = event.target.closest('[data-tp-briefing-open], a[href*="#briefing"]');
    if (trigger) {
      event.preventDefault();
      open();
      return;
    }

    // Clique fora do painel: o alvo é a própria <dialog>, que cobre a viewport.
    if (event.target === modal()) close();
  });

  // O `cancel` do <dialog> não sobe no DOM e nem sempre chega, então o Esc
  // também é tratado direto no teclado — assumimos o fechamento para a
  // animação de saída rodar.
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var el = modal();
    if (!el || !el.open) return;
    event.preventDefault();
    close();
  });

  function bind() {
    var el = modal();
    if (!el || el.dataset.tpBound) return;
    el.dataset.tpBound = '1';

    el.addEventListener('cancel', function (event) {
      event.preventDefault();
      close();
    });

    // Rede de segurança: qualquer fechamento destrava a rolagem da página.
    el.addEventListener('close', function () {
      el.classList.remove('is-closing');
      document.documentElement.classList.remove('tp-briefing-open');
    });

    // O formulário de contato da Shopify não é ajax: o envio recarrega a
    // página e o Liquid marca a confirmação. Reabrimos o modal já nela, para
    // o cliente ver que deu certo em vez de cair numa página qualquer.
    if (el.querySelector('[data-tp-briefing-posted]')) open();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // O editor de tema reinjeta a seção via innerHTML e o markup volta sem
  // passar por nenhum script novo.
  document.addEventListener('shopify:section:load', function () {
    bind();
  });
})();
