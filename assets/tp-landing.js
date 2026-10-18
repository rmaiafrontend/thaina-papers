/* Landing Thainá Papers — reveals, abas do catálogo, paralaxe e botão
   flutuante. Sem dependências. Tudo se re-inicializa quando o editor de
   temas recarrega uma seção. */
(function () {
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveals ---------- */
  var observador = 'IntersectionObserver' in window && !reduz
    ? new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) {
            (e.target._lpRevela || [e.target]).forEach(function (el) { el.classList.add('is-in'); });
            observador.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    : null;

  /* O "wipe" esconde o próprio elemento com clip-path, e um alvo recortado
     a zero nunca cruza o limiar do observador — então quem é observado é o
     pai, e o título é revelado junto com ele. */
  function revelar(raiz) {
    raiz.querySelectorAll('[data-lp-reveal], .lp-final').forEach(function (el) {
      if (!observador) { el.classList.add('is-in'); return; }
      var alvo = el.getAttribute('data-lp-reveal') === 'wipe' ? el.parentElement : el;
      alvo._lpRevela = (alvo._lpRevela || []).concat(el);
      observador.observe(alvo);
    });
  }

  /* ---------- abas ---------- */
  function abas(raiz) {
    raiz.querySelectorAll('[data-lp-catalogo]').forEach(function (cat) {
      var botoes = Array.prototype.slice.call(cat.querySelectorAll('[data-lp-aba]'));
      var paineis = cat.querySelectorAll('[data-lp-painel]');
      if (!botoes.length) {
        paineis.forEach(function (p) { p.classList.add('is-ativo'); });
        return;
      }

      function ativar(i, foco) {
        botoes.forEach(function (b, j) {
          var on = i === j;
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
          paineis[j].classList.toggle('is-ativo', on);
        });
        if (foco) botoes[i].focus();
        botoes[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduz ? 'auto' : 'smooth' });
        /* As etiquetas do painel novo balançam de novo ao aparecer. */
        paineis[i].querySelectorAll('[data-lp-reveal]').forEach(function (el) {
          el.classList.remove('is-in');
          void el.offsetWidth;
          el.classList.add('is-in');
        });
      }

      botoes.forEach(function (b, i) {
        b.addEventListener('click', function () { ativar(i, false); });
        b.addEventListener('keydown', function (ev) {
          var n = botoes.length;
          if (ev.key === 'ArrowRight') { ev.preventDefault(); ativar((i + 1) % n, true); }
          if (ev.key === 'ArrowLeft') { ev.preventDefault(); ativar((i - 1 + n) % n, true); }
        });
      });

      var atual = botoes.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; });
      paineis.forEach(function (p, j) { p.classList.toggle('is-ativo', j === Math.max(atual, 0)); });
    });
  }

  /* ---------- paralaxe ---------- */
  var moveis = [];
  var pedido = false;

  function paralaxe() {
    pedido = false;
    var h = window.innerHeight;
    moveis.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      var centro = r.top + r.height / 2 - h / 2;
      el.style.translate = '0 ' + (centro * el._lpFator).toFixed(1) + 'px';
    });
  }

  function agendar() {
    if (!pedido) {
      pedido = true;
      requestAnimationFrame(paralaxe);
    }
  }

  function prepararParalaxe(raiz) {
    if (reduz) return;
    raiz.querySelectorAll('[data-lp-parallax]').forEach(function (el) {
      el._lpFator = parseFloat(el.getAttribute('data-lp-parallax')) || 0;
      if (moveis.indexOf(el) === -1) moveis.push(el);
    });
    agendar();
  }

  /* ---------- botão flutuante ---------- */
  function flutuante() {
    var botao = document.querySelector('[data-lp-flutuante]');
    var capa = document.querySelector('[data-lp-capa]');
    var final = document.querySelector('[data-lp-final]');
    if (!botao || !('IntersectionObserver' in window)) {
      if (botao) botao.classList.add('is-on');
      return;
    }
    var capaVisivel = true;
    var finalVisivel = false;
    function aplicar() { botao.classList.toggle('is-on', !capaVisivel && !finalVisivel); }
    new IntersectionObserver(function (e) {
      e.forEach(function (x) {
        if (x.target === capa) capaVisivel = x.isIntersecting;
        if (x.target === final) finalVisivel = x.isIntersecting;
      });
      aplicar();
    }, { threshold: 0.15 }).observe(capa || document.body);
    if (final) {
      new IntersectionObserver(function (e) {
        finalVisivel = e[0].isIntersecting;
        aplicar();
      }, { threshold: 0.1 }).observe(final);
    }
  }

  function iniciar(raiz) {
    revelar(raiz);
    abas(raiz);
    prepararParalaxe(raiz);
  }

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);

  document.addEventListener('DOMContentLoaded', function () {
    iniciar(document);
    flutuante();
  });

  document.addEventListener('shopify:section:load', function (e) {
    iniciar(e.target);
  });
})();
