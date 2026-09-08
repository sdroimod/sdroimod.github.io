(function () {
  var _script = document.currentScript;

  var SUPPORTED = ['en','ru','pt','es','vi','tr','uk','fr','it','sv','id','th','ar'];
  var RTL = ['ar'];

  var LANG_MAP = {
    'en':'en','en-US':'en','en-CA':'en','en-GB':'en','en-AU':'en',
    'ru':'ru','ru-RU':'ru','ru-UA':'ru','ru-BY':'ru','ru-KZ':'ru',
    'pt':'pt','pt-BR':'pt','pt-PT':'pt',
    'es':'es','es-MX':'es','es-AR':'es','es-CO':'es','es-CL':'es','es-PE':'es','es-419':'es','es-ES':'es',
    'vi':'vi','vi-VN':'vi',
    'tr':'tr','tr-TR':'tr',
    'uk':'uk','uk-UA':'uk',
    'fr':'fr','fr-FR':'fr','fr-CA':'fr','fr-BE':'fr','fr-CH':'fr',
    'it':'it','it-IT':'it','it-CH':'it',
    'sv':'sv','sv-SE':'sv','sv-FI':'sv',
    'id':'id','id-ID':'id',
    'th':'th','th-TH':'th',
    'ar':'ar','ar-EG':'ar','ar-IQ':'ar','ar-SA':'ar','ar-AE':'ar','ar-JO':'ar','ar-LB':'ar','ar-MA':'ar','ar-DZ':'ar'
  };

  var LANGS = [
    {code:'en',flag:'🇺🇸',name:'English'},
    {code:'ru',flag:'🇷🇺',name:'Русский'},
    {code:'pt',flag:'🇧🇷',name:'Português'},
    {code:'es',flag:'🇲🇽',name:'Español'},
    {code:'vi',flag:'🇻🇳',name:'Tiếng Việt'},
    {code:'tr',flag:'🇹🇷',name:'Türkçe'},
    {code:'uk',flag:'🇺🇦',name:'Українська'},
    {code:'fr',flag:'🇫🇷',name:'Français'},
    {code:'it',flag:'🇮🇹',name:'Italiano'},
    {code:'sv',flag:'🇸🇪',name:'Svenska'},
    {code:'id',flag:'🇮🇩',name:'Bahasa Indonesia'},
    {code:'th',flag:'🇹🇭',name:'ภาษาไทย'},
    {code:'ar',flag:'🇸🇦',name:'العربية'}
  ];

  function detectLang() {
    try {
      var saved = localStorage.getItem('sgen_lang');
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch(e){}
    var list = (navigator.languages && navigator.languages.length)
      ? Array.prototype.slice.call(navigator.languages)
      : [navigator.language || 'en'];
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      if (LANG_MAP[l]) return LANG_MAP[l];
      var b = l.split('-')[0];
      if (LANG_MAP[b]) return LANG_MAP[b];
    }
    return 'en';
  }

  function getLangBase() {
    if (_script && _script.getAttribute('data-lang-base'))
      return _script.getAttribute('data-lang-base');
    return 'lang/';
  }

  function loadLang(code) {
    var base = getLangBase();
    return fetch(base + code + '.json')
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .catch(function(){ return code !== 'en' ? loadLang('en') : {}; });
  }

  function apply(t) {
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var k = el.getAttribute('data-i18n');
      if (t[k] !== undefined) el.innerHTML = t[k];
    });
  }

  function setDir(code) {
    var rtl = RTL.indexOf(code) !== -1;
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', code);
  }

  function injectCSS() {
    var s = document.createElement('style');
    s.textContent = [
      '#lang-picker{position:fixed;top:10px;right:10px;z-index:10000;font-family:system-ui,-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif}',
      '[dir=rtl] #lang-picker{right:auto;left:10px}',
      '.lang-btn{display:flex;align-items:center;gap:6px;background:rgba(20,23,34,.92);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:6px 10px;color:#fff;cursor:pointer;font-size:.82rem;backdrop-filter:blur(8px);transition:border-color .2s;min-height:36px}',
      '.lang-btn:hover{border-color:#10b981}',
      '.lang-name{max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '@media(max-width:420px){.lang-name{display:none}}',
      '.lang-chevron{font-size:.68rem;opacity:.6}',
      '.lang-dropdown{display:none;position:absolute;top:calc(100% + 6px);right:0;background:#141722;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:6px;min-width:180px;box-shadow:0 10px 30px rgba(0,0,0,.6);max-height:300px;overflow-y:auto}',
      '[dir=rtl] .lang-dropdown{right:auto;left:0}',
      '.lang-dropdown.open{display:block}',
      '.lang-option{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;background:none;border:none;border-radius:8px;color:#cbd5e1;cursor:pointer;font-size:.85rem;text-align:left;transition:background .15s,color .15s}',
      '[dir=rtl] .lang-option{text-align:right}',
      '.lang-option:hover{background:rgba(255,255,255,.06);color:#fff}',
      '.lang-option.active{color:#10b981;font-weight:700}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildPicker(cur) {
    var current = LANGS.filter(function(l){return l.code===cur;})[0] || LANGS[0];
    var el = document.createElement('div');
    el.id = 'lang-picker';
    el.innerHTML =
      '<button class="lang-btn" id="lang-btn" aria-label="Select language" aria-expanded="false">'
      + '<span>' + current.flag + '</span>'
      + '<span class="lang-name">' + current.name + '</span>'
      + '<span class="lang-chevron">▾</span>'
      + '</button>'
      + '<div class="lang-dropdown" id="lang-dropdown">'
      + LANGS.map(function(l){
          return '<button class="lang-option'+(l.code===cur?' active':'')+'" data-lang="'+l.code+'">'
            +l.flag+' '+l.name+'</button>';
        }).join('')
      + '</div>';
    document.body.appendChild(el);

    var btn = document.getElementById('lang-btn');
    var dd  = document.getElementById('lang-dropdown');

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = dd.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(){
      dd.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    });
    el.querySelectorAll('.lang-option').forEach(function(opt){
      opt.addEventListener('click', function(){
        try{ localStorage.setItem('sgen_lang', opt.getAttribute('data-lang')); }catch(e){}
        location.reload();
      });
    });
  }

  function init() {
    var lang = detectLang();
    loadLang(lang).then(function(t){
      apply(t);
      setDir(lang);
      injectCSS();
      buildPicker(lang);
      window._t = function(k){ return t[k] !== undefined ? t[k] : k; };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
