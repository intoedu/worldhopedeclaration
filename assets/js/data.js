/* ==========================================================================
   데이터 계층
   - Supabase 가 설정되어 있으면: 게시판·갤러리·응원·문의·후원신청·방문통계를 DB로 처리
   - 설정 전(시안 단계)에는: /data/*.json 파일을 읽어 화면을 구성하고,
     문의/신청은 메일 앱으로 연결합니다.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.WH_CONFIG || {};
  var script = document.currentScript;
  var ROOT = script ? new URL("../../", script.src).href : location.origin + "/";
  var WH = (window.WH = window.WH || {});
  var sb = C.supabase || {};
  var enabled = !!(sb.url && sb.anonKey);
  var clientPromise = null;
  var jsonCache = {};

  function client() {
    if (!enabled) return Promise.reject(new Error("supabase-disabled"));
    if (!clientPromise) {
      clientPromise = (window.supabase ? Promise.resolve() : WH.loadScript(ROOT + "assets/vendor/supabase/supabase.js"))
        .then(function () { return window.supabase.createClient(sb.url, sb.anonKey); });
    }
    return clientPromise;
  }
  function json(name) {
    if (!jsonCache[name]) {
      jsonCache[name] = fetch(ROOT + "data/" + name + ".json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return []; });
    }
    return jsonCache[name];
  }
  function sortPosts(a, b) {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return new Date(b.created_at) - new Date(a.created_at);
  }
  function abs(url) {
    if (!url) return "";
    return /^(https?:|data:|\/)/.test(url) ? url : ROOT + url;
  }
  function visitorId() {
    try {
      var k = "wh-vid", v = localStorage.getItem(k);
      if (!v) {
        v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
        localStorage.setItem(k, v);
      }
      return v;
    } catch (e) { return "anon"; }
  }

  WH.db = {
    enabled: enabled,
    client: client,
    abs: abs,

    /* 게시판 목록: {category, q, page(1~), size} → {items, total} */
    listPosts: function (opt) {
      opt = opt || {};
      var page = Math.max(1, opt.page || 1), size = opt.size || 10;
      if (enabled) {
        return client().then(function (c) {
          var q = c.from("posts").select("id,category,title_ko,title_en,body_ko,body_en,pinned,created_at", { count: "exact" })
            .eq("published", true);
          if (opt.category) q = q.eq("category", opt.category);
          if (opt.q) {
            var term = opt.q.replace(/[%,()]/g, " ").trim();
            if (term) q = q.or("title_ko.ilike.%" + term + "%,title_en.ilike.%" + term + "%,body_ko.ilike.%" + term + "%,body_en.ilike.%" + term + "%");
          }
          return q.order("pinned", { ascending: false }).order("created_at", { ascending: false })
            .range((page - 1) * size, page * size - 1)
            .then(function (res) {
              if (res.error) throw res.error;
              return { items: res.data || [], total: res.count || 0 };
            });
        });
      }
      return json("posts").then(function (rows) {
        var list = rows.filter(function (p) { return p.published !== false; });
        if (opt.category) list = list.filter(function (p) { return p.category === opt.category; });
        if (opt.q) {
          var t = opt.q.toLowerCase();
          list = list.filter(function (p) {
            return [p.title_ko, p.title_en, p.body_ko, p.body_en].join(" ").toLowerCase().indexOf(t) !== -1;
          });
        }
        list.sort(sortPosts);
        return { items: list.slice((page - 1) * size, page * size), total: list.length };
      });
    },

    /* 게시글 1건 + 이전/다음 글 */
    getPost: function (id) {
      if (enabled) {
        return client().then(function (c) {
          return c.from("posts").select("*").eq("id", id).eq("published", true).maybeSingle().then(function (res) {
            if (res.error) throw res.error;
            var post = res.data;
            if (!post) return { post: null };
            var cols = "id,title_ko,title_en,created_at";
            return Promise.all([
              c.from("posts").select(cols).eq("published", true).lt("created_at", post.created_at).order("created_at", { ascending: false }).limit(1),
              c.from("posts").select(cols).eq("published", true).gt("created_at", post.created_at).order("created_at", { ascending: true }).limit(1)
            ]).then(function (r) {
              post.cover_url = abs(post.cover_url);
              return { post: post, prev: (r[0].data || [])[0], next: (r[1].data || [])[0] };
            });
          });
        });
      }
      return json("posts").then(function (rows) {
        var list = rows.filter(function (p) { return p.published !== false; })
          .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        var i = list.findIndex(function (p) { return String(p.id) === String(id); });
        if (i === -1) return { post: null };
        var post = Object.assign({}, list[i], { cover_url: abs(list[i].cover_url) });
        return { post: post, prev: list[i + 1], next: list[i - 1] };
      });
    },

    /* 갤러리: {album, limit} */
    listGallery: function (opt) {
      opt = opt || {};
      if (enabled) {
        return client().then(function (c) {
          var q = c.from("gallery").select("*").eq("published", true);
          if (opt.album) q = q.eq("album", opt.album);
          q = q.order("sort", { ascending: true }).order("created_at", { ascending: false });
          if (opt.limit) q = q.limit(opt.limit);
          return q.then(function (res) {
            if (res.error) throw res.error;
            return (res.data || []).map(function (g) { return Object.assign(g, { image_url: abs(g.image_url) }); });
          });
        });
      }
      return json("gallery").then(function (rows) {
        var list = rows.filter(function (g) { return !opt.album || g.album === opt.album; })
          .map(function (g) { return Object.assign({}, g, { image_url: abs(g.image_url) }); });
        return opt.limit ? list.slice(0, opt.limit) : list;
      });
    },

    /* 승인된 응원 메시지 */
    listCheers: function (limit) {
      if (!enabled) return Promise.resolve([]);
      return client().then(function (c) {
        return c.from("cheers").select("id,name,region,message,created_at").eq("approved", true)
          .order("created_at", { ascending: false }).limit(limit || 6)
          .then(function (res) { if (res.error) throw res.error; return res.data || []; });
      });
    },

    /* 공개 폼 접수: inquiries / donation_applications / cheers */
    insert: function (table, row) {
      if (!enabled) return Promise.reject(new Error("supabase-disabled"));
      return client().then(function (c) {
        return c.from(table).insert(row).then(function (res) { if (res.error) throw res.error; return true; });
      });
    },

    /* 방문 기록 (페이지당 1회) */
    trackVisit: function () {
      if (!enabled) return Promise.resolve();
      var path = location.pathname.replace(/index\.html$/, "").replace(/\.html$/, "") || "/";
      return client().then(function (c) {
        return c.rpc("track_visit", { p_path: path.slice(0, 200), p_visitor: visitorId() });
      });
    },
    visitStats: function () {
      if (!enabled) return Promise.resolve(null);
      return client().then(function (c) {
        return c.rpc("visit_stats").then(function (res) { if (res.error) throw res.error; return res.data; });
      });
    }
  };
})();
