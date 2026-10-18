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

  /* "wipe" e "escrita" escondem o próprio elemento com clip-path, e um
     alvo recortado a zero nunca cruza o limiar do observador — então quem
     é observado é o pai, e o elemento é revelado junto com ele. */
  function revelar(raiz) {
    raiz.querySelectorAll('[data-lp-reveal], .lp-final').forEach(function (el) {
      if (!observador) { el.classList.add('is-in'); return; }
      var tipo = el.getAttribute('data-lp-reveal');
      var alvo = tipo === 'wipe' || tipo === 'escrita' ? el.parentElement : el;
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
        /* Centraliza a pílula na faixa de filtros (rolagem só horizontal). */
        var faixa = botoes[i].parentElement;
        faixa.scrollTo({
          left: botoes[i].offsetLeft - (faixa.clientWidth - botoes[i].offsetWidth) / 2,
          behavior: reduz ? 'auto' : 'smooth'
        });
        /* Se a pessoa já estava lá embaixo na grade, volta para o começo da
           ocasião nova — logo abaixo dos filtros grudados. */
        var topo = paineis[i].getBoundingClientRect().top;
        var alturaFiltros = faixa.offsetHeight;
        if (topo < alturaFiltros) {
          window.scrollTo({ top: window.scrollY + topo - alturaFiltros - 8, behavior: reduz ? 'auto' : 'smooth' });
        }
        /* Cards do painel novo aparecem já revelados. */
        paineis[i].querySelectorAll('[data-lp-reveal]').forEach(function (el) { el.classList.add('is-in'); });
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

  /* ---------- álbum da moldura ---------- */
  /* Troca a foto a cada TEMPO ms, só enquanto a moldura está na tela e a
     aba visível. Toque avança na hora. Com movimento reduzido não gira
     sozinho — só no toque. */
  var TEMPO = 3800;

  function albuns(raiz) {
    raiz.querySelectorAll('[data-lp-album]').forEach(function (album) {
      if (album._lpAlbum) return;
      var slides = album.querySelectorAll('[data-lp-slide]');
      if (slides.length < 2) return;
      var marcas = album.querySelectorAll('.lp-album__marcas li');
      var legenda = album.parentElement.querySelector('[data-lp-legenda]');
      var atual = 0;
      var timer = null;
      var visivel = false;
      album.style.setProperty('--lp-tempo', TEMPO + 'ms');

      function mostrar(i) {
        slides[atual].classList.remove('is-ativo');
        atual = (i + slides.length) % slides.length;
        slides[atual].classList.add('is-ativo');
        /* a imagem lazy da próxima já começa a carregar */
        var prox = slides[(atual + 1) % slides.length].querySelector('img');
        if (prox) prox.loading = 'eager';
        marcas.forEach(function (m, j) {
          m.classList.remove('is-ativo');
          m.classList.toggle('is-vista', j < atual);
          if (j === atual) { void m.offsetWidth; m.classList.add('is-ativo'); }
        });
        if (legenda) {
          legenda.classList.add('is-trocando');
          setTimeout(function () {
            legenda.textContent = slides[atual].getAttribute('data-legenda') || '';
            legenda.classList.remove('is-trocando');
          }, 350);
        }
      }

      function agendarTroca() {
        clearTimeout(timer);
        if (reduz || !visivel || document.hidden) return;
        timer = setTimeout(function () { mostrar(atual + 1); agendarTroca(); }, TEMPO);
      }

      album.addEventListener('click', function () { mostrar(atual + 1); agendarTroca(); });
      document.addEventListener('visibilitychange', agendarTroca);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          visivel = e[0].isIntersecting;
          agendarTroca();
        }, { threshold: 0.3 }).observe(album);
      } else {
        visivel = true;
        agendarTroca();
      }
      if (reduz) marcas.forEach(function (m) { m.style.display = 'none'; });
      album._lpAlbum = true;
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
    /* Sai também na grade do catálogo: lá cada modelo tem o próprio botão
       de pedir, e o flutuante só tampava os cards. */
    var fichario = document.querySelector('[data-lp-loja] .lp-loja__miolo, [data-lp-catalogo-miolo]');
    var capaVisivel = true;
    var finalVisivel = false;
    var fichVisivel = false;
    function aplicar() { botao.classList.toggle('is-on', !capaVisivel && !finalVisivel && !fichVisivel); }
    if (fichario) {
      new IntersectionObserver(function (e) {
        fichVisivel = e[0].isIntersecting;
        aplicar();
      }, { rootMargin: '-25% 0px -25% 0px' }).observe(fichario);
    }
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

  /* ---------- atalhos para uma ocasião do catálogo ---------- */
  /* Links com data-lp-ir-ocasiao="consultorios": se o catálogo está nesta
     página, filtram ali mesmo (evento lp:ocasiao, ouvido por
     tp-lp-loja.js) e rolam até ele; se não está, seguem o href normal. */
  function atalhos(raiz) {
    raiz.querySelectorAll('[data-lp-ir-ocasiao]').forEach(function (link) {
      if (link._lpAtalho) return;
      link._lpAtalho = true;
      link.addEventListener('click', function (e) {
        if (!document.querySelector('[data-lp-loja]')) return;
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('lp:ocasiao', { detail: link.getAttribute('data-lp-ir-ocasiao') }));
      });
    });
  }

  function iniciar(raiz) {
    atalhos(raiz);
    revelar(raiz);
    abas(raiz);
    albuns(raiz);
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
