/* Shivdurg Sahyadri Fort Heritage - Interactive Application Controller */

(function() {
  // State Management
  const defaultSaved = ['raigad', 'rajgad', 'sindhudurg', 'lohagad', 'pratapgad', 'torna', 'sinhagad', 'shivneri'];
  let savedForts = defaultSaved.slice();
  try {
    const stored = localStorage.getItem('shivdurg_saved_forts');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) savedForts = parsed;
    }
  } catch (e) {}

  window.appState = {
    currentPage: 'home',
    currentFortId: 'raigad',
    selectedMapFortId: 'lohagad',
    mapDistrict: 'All',
    mapSearch: '',
    mapSort: 'elev-desc',
    mapLayer: 'map',
    mapZoom: 1,
    mobileMapMode: 'split',
    dirRegion: 'All',
    dirType: 'All',
    dirGrade: 'All',
    dirSearch: '',
    audioPlaying: false,
    audioTimer: null
  };

  function getForts() {
    return window.SHIVDURG_FORTS_DATA || [];
  }

  function findFort(id) {
    const list = getForts();
    return list.find(function(f) { return f.id === id; }) || list[0];
  }

  function saveBookmarks() {
    try {
      localStorage.setItem('shivdurg_saved_forts', JSON.stringify(savedForts));
    } catch (e) {}
    updateBookmarkBadge();
  }

  function updateBookmarkBadge() {
    const badge = document.getElementById('savedCountBadge');
    const mobileBadge = document.getElementById('mobileSavedBadge');
    if (badge) badge.textContent = String(savedForts.length);
    if (mobileBadge) mobileBadge.textContent = String(savedForts.length);
  }

  window.isBookmarked = function(fortId) {
    return savedForts.indexOf(fortId) !== -1;
  };

  window.showToast = function(title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'bg-[#13261b] text-[#faf8f3] border border-[#eab308]/50 rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 max-w-sm transition-all duration-300';
    toast.innerHTML = '<div class="w-7 h-7 rounded-full bg-[#eab308]/20 text-[#facc15] flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">✓</div>' +
      '<div class="flex-1 min-w-0">' +
        '<p class="font-semibold text-xs text-[#facc15] uppercase tracking-wider">' + title + '</p>' +
        '<p class="text-xs text-stone-200 mt-0.5 leading-relaxed">' + message + '</p>' +
      '</div>';
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }, 3400);
  };

  window.toggleBookmark = function(fortId, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const fort = findFort(fortId);
    const idx = savedForts.indexOf(fortId);
    if (idx === -1) {
      savedForts.push(fortId);
      window.showToast('Added to Expedition List', fort.name + ' (' + fort.marathiName + ') saved to your citadel bookmarks.');
    } else {
      savedForts.splice(idx, 1);
      window.showToast('Removed from Bookmarks', fort.name + ' removed from your saved list.');
    }
    saveBookmarks();
    renderAllDynamicViews();
  };

  // Navigation Controller
  window.navigatePage = function(pageId, subParam) {
    window.appState.currentPage = pageId;
    const pages = ['home', 'map', 'detail', 'explore', 'guides', 'history', 'gallery', 'about'];
    pages.forEach(function(p) {
      const el = document.getElementById('page-' + p);
      if (el) {
        if (p === pageId) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
      const navBtn = document.getElementById('nav-' + p);
      if (navBtn) {
        if (p === pageId) {
          navBtn.className = 'px-3 py-1.5 rounded-full bg-[#eab308] text-[#13261b] font-semibold text-xs transition';
        } else {
          navBtn.className = 'px-3 py-1.5 rounded-full text-stone-200 hover:text-[#facc15] hover:bg-white/5 text-xs font-medium transition';
        }
      }
      const bnav = document.getElementById('bnav-' + p);
      if (bnav) {
        if (p === pageId) {
          bnav.className = 'flex flex-col items-center justify-center py-1.5 text-[#facc15] font-semibold text-[11px]';
        } else {
          bnav.className = 'flex flex-col items-center justify-center py-1.5 text-stone-300 hover:text-white text-[11px]';
        }
      }
    });

    // Close mobile menu if open
    const mMenu = document.getElementById('mobileMenuDrawer');
    if (mMenu) mMenu.classList.add('hidden');

    if (pageId === 'detail') {
      if (subParam) window.appState.currentFortId = subParam;
      renderFortDetailPage();
      refreshLeafletSize();
    } else if (pageId === 'map') {
      if (subParam) {
        window.appState.mapDistrict = subParam;
      }
      renderMapSidebarAndPins();
      refreshLeafletSize();
      const map = ensureLeafletMap();
      if (map && subParam && subParam !== 'All') {
        const filteredCoords = getFilteredMapForts().map(function(f) { return [f.lat, f.lng]; });
        if (filteredCoords.length === 1) {
          map.flyTo(filteredCoords[0], 11, { duration: 0.8 });
        } else if (filteredCoords.length > 1) {
          map.flyToBounds(filteredCoords, { padding: [50, 50], duration: 0.8 });
        }
      }
    } else if (pageId === 'explore') {
      renderExploreDirectory();
    } else if (pageId === 'gallery') {
      renderGalleryGrid();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.openFortDetail = function(fortId) {
    window.appState.currentFortId = fortId;
    window.navigatePage('detail', fortId);
  };

  window.toggleMobileMenu = function() {
    const mMenu = document.getElementById('mobileMenuDrawer');
    if (mMenu) mMenu.classList.toggle('hidden');
  };

  // Global & Hero Search
  window.runGlobalSearch = function() {
    const input = document.getElementById('globalSearchInput');
    const q = input ? input.value.trim() : '';
    if (!q) {
      window.navigatePage('explore');
      return;
    }
    const lower = q.toLowerCase();
    const match = getForts().find(function(f) {
      return f.name.toLowerCase().indexOf(lower) !== -1 ||
             f.marathiName.indexOf(q) !== -1 ||
             f.district.toLowerCase() === lower;
    });
    if (match && getForts().filter(function(f) { return f.district.toLowerCase() === lower; }).length === 1) {
      window.openFortDetail(match.id);
    } else {
      window.appState.dirSearch = q;
      const dirInput = document.getElementById('dirSearchInput');
      if (dirInput) dirInput.value = q;
      window.navigatePage('explore');
    }
  };

  window.runHeroSearch = function() {
    const qEl = document.getElementById('heroSearchInput');
    const rEl = document.getElementById('heroRegionSelect');
    const q = qEl ? qEl.value.trim() : '';
    const reg = rEl ? rEl.value : 'All';
    window.appState.dirSearch = q;
    window.appState.dirRegion = reg;
    const dirInput = document.getElementById('dirSearchInput');
    if (dirInput) dirInput.value = q;
    window.navigatePage('explore');
  };

  window.quickFilterExplore = function(field, value) {
    window.appState.dirRegion = 'All';
    window.appState.dirType = 'All';
    window.appState.dirGrade = 'All';
    window.appState.dirSearch = '';
    if (field === 'region') window.appState.dirRegion = value;
    if (field === 'type') window.appState.dirType = value;
    if (field === 'grade') window.appState.dirGrade = value;
    window.navigatePage('explore');
  };

  // ==========================================
  // HOME PAGE FEATURED & REGION RENDERING
  // ==========================================
  function renderHomeFeatured() {
    const container = document.getElementById('homeFeaturedGrid');
    if (!container) return;
    const featuredIds = ['raigad', 'rajgad', 'sindhudurg', 'pratapgad'];
    const html = featuredIds.map(function(fid) {
      const f = findFort(fid);
      const gradeColors = {
        'Easy': 'bg-emerald-100 text-emerald-800 border-emerald-300',
        'Moderate': 'bg-amber-100 text-amber-800 border-amber-300',
        'Difficult': 'bg-rose-100 text-rose-800 border-rose-300'
      };
      const gClass = gradeColors[f.grade] || gradeColors['Moderate'];
      return '<article class="heritage-card bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm flex flex-col">' +
        '<div class="relative h-48 overflow-hidden bg-[#13261b] group cursor-pointer" onclick="window.openFortDetail(\'' + f.id + '\')">' +
          '<img src="' + f.image + '" alt="' + f.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />' +
          '<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"></div>' +
          '<span class="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#eab308] text-[#13261b] font-bold text-[10px] tracking-wider uppercase shadow">' + f.categoryBadge + '</span>' +
          '<button onclick="window.toggleBookmark(\'' + f.id + '\', event)" title="Save Fort" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-[#eab308] text-white hover:text-[#13261b] flex items-center justify-center transition text-xs">' +
            (window.isBookmarked(f.id) ? '★' : '☆') +
          '</button>' +
          '<div class="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px]">' +
            '<span class="flex items-center gap-1 font-medium"><span class="text-[#facc15]">📍</span> ' + f.district + ' District</span>' +
            '<span class="font-marathi text-amber-200 font-semibold">' + f.marathiName + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="p-4 flex-1 flex flex-col justify-between">' +
          '<div>' +
            '<div class="flex items-center justify-between gap-2 mb-1.5">' +
              '<span class="text-[10px] font-bold uppercase tracking-wider text-stone-500">' + f.type + '</span>' +
              '<span class="px-2 py-0.5 text-[10px] font-semibold rounded border ' + gClass + '">' + f.grade + '</span>' +
            '</div>' +
            '<h3 class="font-serif-title font-bold text-lg text-[#13261b] hover:text-[#ca8a04] cursor-pointer transition" onclick="window.openFortDetail(\'' + f.id + '\')">' + f.name + '</h3>' +
            '<p class="text-[11px] text-amber-800 font-medium mb-2">' + f.mapSubtitle + '</p>' +
            '<p class="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">' + f.shortDesc + '</p>' +
          '</div>' +
          '<div>' +
            '<div class="grid grid-cols-2 gap-2 bg-[#f4f0e6] rounded-lg p-2.5 mb-3 text-center border border-stone-200/70">' +
              '<div>' +
                '<span class="block text-[9px] uppercase tracking-wider text-stone-500 font-semibold">Elevation</span>' +
                '<span class="text-xs font-bold text-[#13261b]">' + (f.elevationMeters > 50 ? f.elevationMeters + ' m' : 'Sea Level') + '</span>' +
              '</div>' +
              '<div class="border-l border-stone-300/70">' +
                '<span class="block text-[9px] uppercase tracking-wider text-stone-500 font-semibold">Trek Time</span>' +
                '<span class="text-xs font-bold text-[#13261b]">' + f.trailTime + '</span>' +
              '</div>' +
            '</div>' +
            '<button onclick="window.openFortDetail(\'' + f.id + '\')" class="w-full py-2 rounded-lg bg-[#f4f0e6] hover:bg-[#13261b] text-[#13261b] hover:text-[#facc15] font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-stone-300/80">' +
              '<span>View Fort Details</span> <span>→</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
    container.innerHTML = html;
  }

  // ==========================================
  // INTERACTIVE FORT MAP PAGE (SCREEN 2)
  // ==========================================
  window.filterMapDistrict = function(district) {
    window.appState.mapDistrict = district;
    renderMapSidebarAndPins();
  };

  window.handleMapSearch = function(val) {
    window.appState.mapSearch = val || '';
    renderMapSidebarAndPins();
  };

  window.handleMapSort = function(val) {
    window.appState.mapSort = val || 'elev-desc';
    renderMapSidebarAndPins();
  };

  // Leaflet Interactive Map API Instances
  let leafletMap = null;
  let leafletTileLayer = null;
  let leafletMarkersLayer = null;
  let leafletCircuitLine = null;
  let detailLeafletMap = null;
  let detailLeafletMarker = null;

  const TILE_URLS = {
    map: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: '&copy; Esri, Maxar, Earthstar Geographics'
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenTopoMap (CC-BY-SA)'
    }
  };

  function ensureLeafletMap() {
    if (typeof window.L === 'undefined') return null;
    const container = document.getElementById('leafletMapContainer');
    if (!container) return null;
    if (!leafletMap) {
      leafletMap = window.L.map(container, {
        center: [18.35, 73.75],
        zoom: 7,
        minZoom: 6,
        maxZoom: 17,
        zoomControl: false,
        scrollWheelZoom: true
      });
      const cfg = TILE_URLS[window.appState.mapLayer] || TILE_URLS.map;
      leafletTileLayer = window.L.tileLayer(cfg.url, {
        attribution: cfg.attr,
        maxZoom: 17
      }).addTo(leafletMap);
      leafletMarkersLayer = window.L.layerGroup().addTo(leafletMap);
      if (typeof window.ResizeObserver !== 'undefined') {
        const ro = new window.ResizeObserver(function() {
          if (leafletMap) leafletMap.invalidateSize();
        });
        ro.observe(container);
      }
    }
    return leafletMap;
  }

  function refreshLeafletSize() {
    setTimeout(function() {
      if (leafletMap) leafletMap.invalidateSize();
      if (detailLeafletMap) detailLeafletMap.invalidateSize();
    }, 60);
    setTimeout(function() {
      if (leafletMap) leafletMap.invalidateSize();
      if (detailLeafletMap) detailLeafletMap.invalidateSize();
    }, 280);
  }

  window.setMapLayer = function(layer) {
    window.appState.mapLayer = layer;
    const canvas = document.getElementById('sahyadriMapViewport');
    if (canvas) {
      canvas.setAttribute('data-layer', layer);
    }
    ['map', 'satellite', 'terrain'].forEach(function(l) {
      const btn = document.getElementById('layerBtn-' + l);
      if (btn) {
        if (l === layer) {
          btn.className = 'px-3 py-1.5 text-xs font-bold bg-[#13261b] text-[#facc15] rounded-md shadow-sm transition';
        } else {
          btn.className = 'px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-md transition';
        }
      }
    });
    const map = ensureLeafletMap();
    if (map && leafletTileLayer) {
      map.removeLayer(leafletTileLayer);
      const cfg = TILE_URLS[layer] || TILE_URLS.map;
      leafletTileLayer = window.L.tileLayer(cfg.url, {
        attribution: cfg.attr,
        maxZoom: 17
      }).addTo(map);
    }
    renderMapSidebarAndPins();
  };

  window.zoomMap = function(delta) {
    const map = ensureLeafletMap();
    if (map) {
      if (delta > 0) map.zoomIn(1);
      else map.zoomOut(1);
      return;
    }
    let z = window.appState.mapZoom + delta;
    if (z < 0.85) z = 0.85;
    if (z > 1.85) z = 1.85;
    window.appState.mapZoom = z;
    const inner = document.getElementById('mapZoomStage');
    if (inner) {
      inner.style.transform = 'scale(' + z.toFixed(2) + ')';
    }
  };

  window.resetMapBounds = function() {
    window.appState.mapZoom = 1;
    window.appState.mapDistrict = 'All';
    window.appState.mapSearch = '';
    const sInput = document.getElementById('mapSidebarSearch');
    if (sInput) sInput.value = '';
    renderMapSidebarAndPins();
    const map = ensureLeafletMap();
    if (map) {
      const allCoords = getForts().map(function(f) { return [f.lat, f.lng]; });
      if (allCoords.length > 0) {
        map.flyToBounds(allCoords, { padding: [45, 45], duration: 0.9 });
      }
    }
    window.showToast('Sahyadri Survey Reset', 'Showing all 16 UNESCO & State Protected citadels across Maharashtra.');
  };

  window.toggleMapFullscreen = function() {
    const wrap = document.getElementById('fortMapMainWrapper');
    if (!wrap) return;
    wrap.classList.toggle('fixed');
    wrap.classList.toggle('inset-0');
    wrap.classList.toggle('z-50');
    wrap.classList.toggle('bg-[#faf8f3]');
  };

  window.toggleMobileMapMode = function(mode) {
    window.appState.mobileMapMode = mode;
    const listCol = document.getElementById('mapSidebarColumn');
    const mapCol = document.getElementById('mapCanvasColumn');
    if (!listCol || !mapCol) return;
    if (mode === 'list') {
      listCol.classList.remove('hidden');
      mapCol.classList.add('hidden', 'md:flex');
    } else if (mode === 'map') {
      listCol.classList.add('hidden', 'md:flex');
      mapCol.classList.remove('hidden');
    } else {
      listCol.classList.remove('hidden');
      mapCol.classList.remove('hidden');
    }
    ['split', 'list', 'map'].forEach(function(m) {
      const b = document.getElementById('mobMapBtn-' + m);
      if (b) {
        b.className = (m === mode)
          ? 'px-3 py-1 rounded-full bg-[#eab308] text-[#13261b] font-bold text-xs'
          : 'px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs';
      }
    });
  };

  window.selectMapFort = function(fortId, shouldFly) {
    window.appState.selectedMapFortId = fortId;
    renderMapSidebarAndPins();
    const f = findFort(fortId);
    const map = ensureLeafletMap();
    if (map && f && shouldFly !== false) {
      map.flyTo([f.lat, f.lng], Math.max(map.getZoom(), 10), {
        animate: true,
        duration: 0.85
      });
    }
  };

  window.closeMapPopup = function(ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    window.appState.selectedMapFortId = '';
    renderMapSidebarAndPins();
  };

  function getFilteredMapForts() {
    const q = window.appState.mapSearch.trim().toLowerCase();
    const dist = window.appState.mapDistrict;
    let list = getForts().filter(function(f) {
      const matchDist = (dist === 'All') || (f.district.toLowerCase() === dist.toLowerCase());
      const matchQ = !q ||
        f.name.toLowerCase().indexOf(q) !== -1 ||
        f.marathiName.indexOf(q) !== -1 ||
        f.district.toLowerCase().indexOf(q) !== -1 ||
        f.type.toLowerCase().indexOf(q) !== -1;
      return matchDist && matchQ;
    });

    const sortMode = window.appState.mapSort;
    list.sort(function(a, b) {
      if (sortMode === 'elev-desc') return b.elevationMeters - a.elevationMeters;
      if (sortMode === 'elev-asc') return a.elevationMeters - b.elevationMeters;
      if (sortMode === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }

  function renderMapSidebarAndPins() {
    const filtered = getFilteredMapForts();
    const total = getForts().length;

    // District Filter Pills
    const districts = ['All', 'Pune', 'Raigad', 'Nashik', 'Satara', 'Sindhudurg', 'Ratnagiri', 'Kolhapur', 'Sambhajinagar'];
    const pillBar = document.getElementById('mapDistrictPills');
    if (pillBar) {
      pillBar.innerHTML = districts.map(function(d) {
        const active = window.appState.mapDistrict === d;
        const label = d === 'All' ? 'All Forts' : d;
        return '<button onclick="window.filterMapDistrict(\'' + d + '\')" class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition ' +
          (active ? 'bg-[#eab308] text-[#13261b] shadow' : 'bg-[#1b3526] text-stone-300 hover:bg-[#254734] hover:text-white border border-white/10') +
          '">' + label + '</button>';
      }).join('');
    }

    // Count Header
    const countEl = document.getElementById('mapShowingCount');
    if (countEl) {
      countEl.textContent = 'SHOWING ' + filtered.length + ' OF ' + total + ' FORTS';
    }

    // Sidebar Cards
    const listContainer = document.getElementById('mapFortCardsList');
    if (listContainer) {
      if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="p-6 text-center text-stone-500 text-xs bg-white rounded-xl border border-stone-200">No forts match your current filter. Click "All Forts" to reset.</div>';
      } else {
        listContainer.innerHTML = filtered.map(function(f) {
          const isSelected = window.appState.selectedMapFortId === f.id;
          const isSea = f.type.indexOf('Sea') !== -1;
          const badgeClass = isSea
            ? 'bg-sky-100 text-sky-900 border-sky-200'
            : (f.type.indexOf('Capital') !== -1 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-orange-100 text-orange-900 border-orange-200');
          const badgeText = isSea ? 'SEA FORT' : (f.type.indexOf('Capital') !== -1 ? 'CAPITAL CITADEL' : 'HILL FORT');

          return '<div onclick="window.selectMapFort(\'' + f.id + '\')" class="p-3.5 rounded-xl bg-white border transition cursor-pointer ' +
            (isSelected ? 'border-2 border-[#eab308] shadow-md ring-2 ring-[#eab308]/20' : 'border-stone-200/90 hover:border-stone-400 shadow-sm') + '">' +
            '<div class="flex items-start justify-between gap-2 mb-1">' +
              '<h4 class="font-serif-title font-bold text-base text-[#13261b] flex items-center gap-1.5">' +
                (isSelected ? '<span class="w-2 h-2 rounded-full bg-red-600 inline-block"></span>' : '') +
                f.name +
              '</h4>' +
              '<span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ' + badgeClass + '">' + badgeText + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-3 text-[11px] text-stone-500 mb-2">' +
              '<span>📍 ' + f.district + '</span>' +
              '<span>⛰️ ' + (f.elevationMeters > 50 ? f.elevationMeters.toLocaleString() + ' m' : 'Sea Level') + '</span>' +
              '<span class="font-marathi text-amber-900 font-medium">' + f.marathiName + '</span>' +
            '</div>' +
            '<p class="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-2.5">' + f.shortDesc + '</p>' +
            '<div class="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">' +
              (isSelected
                ? '<span class="font-bold text-[#ca8a04] flex items-center gap-1">Pin Highlighted ⌖</span>'
                : '<span class="font-semibold text-[#ca8a04] hover:underline">View on Map →</span>') +
              '<div class="flex items-center gap-2">' +
                '<span class="text-stone-500 font-medium">' + f.mapSubtitle + '</span>' +
                '<button onclick="window.openFortDetail(\'' + f.id + '\'); event.stopPropagation();" class="px-2 py-0.5 rounded bg-[#13261b] text-[#facc15] font-semibold text-[10px] hover:bg-[#254734]">Explore →</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // Render Custom Attached Icon Map Pins on the Interactive Leaflet Map API
    const map = ensureLeafletMap();
    if (map && leafletMarkersLayer) {
      leafletMarkersLayer.clearLayers();
      if (leafletCircuitLine) {
        map.removeLayer(leafletCircuitLine);
        leafletCircuitLine = null;
      }

      // Draw dashed golden Sahyadri Fort Heritage Circuit line connecting filtered forts
      if (filtered.length > 1) {
        const latlngs = filtered.map(function(f) { return [f.lat, f.lng]; });
        leafletCircuitLine = window.L.polyline(latlngs, {
          color: '#eab308',
          weight: 2.5,
          opacity: 0.75,
          dashArray: '6, 6'
        }).addTo(map);
      }

      filtered.forEach(function(f) {
        const isSelected = window.appState.selectedMapFortId === f.id;
        const pinHtml =
          '<div class="custom-leaflet-pin ' + (isSelected ? 'is-active-pin' : '') + '">' +
            '<img src="' + window.FORT_PIN_ICON_URI + '" alt="' + f.name + '" style="width:42px;height:46px;object-fit:contain;" class="drop-shadow-lg" />' +
            '<span class="mt-0.5 px-1.5 py-0.5 rounded bg-[#13261b]/95 text-[#facc15] font-bold text-[10px] whitespace-nowrap shadow-md border border-[#eab308]/50">' +
              f.name.replace(' Fort', '') +
            '</span>' +
          '</div>';

        const icon = window.L.divIcon({
          className: 'leaflet-div-icon',
          html: pinHtml,
          iconSize: [80, 62],
          iconAnchor: [40, 52]
        });

        const marker = window.L.marker([f.lat, f.lng], { icon: icon });
        marker.on('click', function() {
          window.selectMapFort(f.id, true);
        });
        marker.bindTooltip(
          '<strong>' + f.name + ' (' + f.marathiName + ')</strong><br/>' + f.district + ' · ' + f.elevationDisplay,
          { direction: 'top', offset: [0, -46] }
        );
        marker.addTo(leafletMarkersLayer);
      });
    }

    // Render Floating Active Fort Card Popup on the Map (matching Screen 2)
    const popupContainer = document.getElementById('mapActivePopupCard');
    if (popupContainer) {
      const selFort = filtered.find(function(f) { return f.id === window.appState.selectedMapFortId; }) ||
                      (filtered.length > 0 ? filtered[0] : null);
      if (!selFort || !window.appState.selectedMapFortId) {
        popupContainer.classList.add('hidden');
      } else {
        popupContainer.classList.remove('hidden');
        popupContainer.innerHTML =
          '<div class="bg-[#faf8f3] rounded-2xl shadow-2xl border-2 border-[#eab308]/70 overflow-hidden w-72 sm:w-80">' +
            '<div class="relative h-36 bg-[#13261b]">' +
              '<img src="' + selFort.image + '" alt="' + selFort.name + '" class="w-full h-full object-cover" />' +
              '<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>' +
              '<button onclick="window.closeMapPopup(event)" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-xs font-bold">✕</button>' +
              '<div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">' +
                '<img src="' + window.FORT_PIN_ICON_URI + '" alt="Emblem" class="w-6 h-6 object-contain bg-black/40 rounded-full p-0.5" />' +
                '<span class="px-2 py-0.5 rounded bg-[#eab308] text-[#13261b] font-bold text-[10px]">' + selFort.district + ' District</span>' +
                '<span class="px-2 py-0.5 rounded bg-black/70 text-white font-bold text-[10px]">' + (selFort.elevationMeters > 50 ? selFort.elevationMeters.toLocaleString() + ' m' : 'Sea Level') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="p-4">' +
              '<h3 class="font-serif-title font-bold text-base text-[#13261b]">' + selFort.name + ' <span class="font-marathi text-sm text-amber-900">(' + selFort.marathiName + ')</span></h3>' +
              '<p class="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">' + selFort.shortDesc + '</p>' +
              '<div class="grid grid-cols-3 gap-1.5 bg-[#efeae0] rounded-lg p-2 my-3 text-center border border-stone-200">' +
                '<div>' +
                  '<span class="block text-[9px] uppercase text-stone-500 font-semibold">TRAIL TIME</span>' +
                  '<span class="text-[11px] font-bold text-[#13261b]">' + selFort.trailTime + '</span>' +
                '</div>' +
                '<div class="border-x border-stone-300/70">' +
                  '<span class="block text-[9px] uppercase text-stone-500 font-semibold">GRADE</span>' +
                  '<span class="text-[11px] font-bold text-amber-800">' + selFort.grade + '</span>' +
                '</div>' +
                '<div>' +
                  '<span class="block text-[9px] uppercase text-stone-500 font-semibold">WATER</span>' +
                  '<span class="text-[11px] font-bold text-emerald-800">Perennial</span>' +
                '</div>' +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                '<button onclick="window.openFortDetail(\'' + selFort.id + '\')" class="flex-1 py-2 px-3 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-[#13261b] font-bold text-xs transition shadow-sm text-center">' +
                  'Trek Itinerary & GPX' +
                '</button>' +
                '<button onclick="window.toggleBookmark(\'' + selFort.id + '\', event)" class="w-9 h-9 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-[#13261b] flex items-center justify-center font-bold text-sm" title="Bookmark Citadel">' +
                  (window.isBookmarked(selFort.id) ? '★' : '☆') +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
    }
  }

  // ==========================================
  // FORT DETAIL PAGE RENDERER (SCREEN 1)
  // ==========================================
  window.scrollToDetailSection = function(secId) {
    const el = document.getElementById(secId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function renderFortDetailPage() {
    const fort = findFort(window.appState.currentFortId);
    if (!fort) return;

    // Populate Citadel Switcher Bar
    const switcher = document.getElementById('fortDetailSwitcher');
    if (switcher) {
      switcher.innerHTML = getForts().map(function(f) {
        const active = f.id === fort.id;
        return '<button onclick="window.openFortDetail(\'' + f.id + '\')" class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ' +
          (active ? 'bg-[#eab308] text-[#13261b] shadow-sm' : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300') + '">' +
          '<img src="' + window.FORT_PIN_ICON_URI + '" alt="" class="w-3.5 h-3.5 object-contain" />' +
          '<span>' + f.name.replace(' Fort', '') + '</span>' +
        '</button>';
      }).join('');
    }

    // Breadcrumb & Hero
    const bcName = document.getElementById('detailBreadcrumbName');
    if (bcName) bcName.textContent = fort.name + ' (' + fort.marathiName + ')';

    const heroImg = document.getElementById('detailHeroImg');
    if (heroImg) {
      heroImg.src = fort.image;
      heroImg.alt = fort.name;
    }

    const bUnesco = document.getElementById('detailBadgeUnesco');
    if (bUnesco) bUnesco.textContent = fort.unesco;
    const bAsi = document.getElementById('detailBadgeAsi');
    if (bAsi) bAsi.textContent = fort.asi;
    const bCat = document.getElementById('detailBadgeCategory');
    if (bCat) bCat.textContent = fort.categoryBadge;

    const titleEl = document.getElementById('detailHeroTitle');
    if (titleEl) {
      titleEl.innerHTML = fort.name + ' <span class="font-marathi text-[#facc15] font-normal">(' + fort.marathiName + ')</span>';
    }
    const epEl = document.getElementById('detailHeroEpithet');
    if (epEl) epEl.textContent = fort.epithet;
    const descEl = document.getElementById('detailHeroDesc');
    if (descEl) descEl.textContent = fort.shortDesc;

    // Quick Stats Bar (6 items matching Screen 1)
    const statsGrid = document.getElementById('detailStatsStrip');
    if (statsGrid) {
      const stats = [
        { label: 'ALTITUDE / ELEVATION', val: fort.elevationDisplay },
        { label: 'TREK DIFFICULTY', val: '● ' + fort.grade },
        { label: 'BASE VILLAGE', val: fort.baseVillage },
        { label: 'TREK ENDURANCE', val: fort.endurance },
        { label: 'ASCENT STEPS', val: fort.steps },
        { label: 'SOVEREIGN ERA', val: fort.era }
      ];
      statsGrid.innerHTML = stats.map(function(s) {
        return '<div class="px-3 py-2.5 border-r border-white/10 last:border-r-0">' +
          '<span class="block text-[9px] uppercase tracking-widest text-stone-400 font-semibold">' + s.label + '</span>' +
          '<span class="text-xs sm:text-sm font-bold text-white mt-0.5 block">' + s.val + '</span>' +
        '</div>';
      }).join('');
    }

    // Overview & Architectural Narrative
    const ovTitle = document.getElementById('detailOverviewTitle');
    if (ovTitle) ovTitle.textContent = fort.overviewTitle;
    const ovP1 = document.getElementById('detailOverviewP1');
    if (ovP1) ovP1.textContent = fort.overviewP1;
    const ovP2 = document.getElementById('detailOverviewP2');
    if (ovP2) ovP2.textContent = fort.overviewP2;

    const pillarsEl = document.getElementById('detailArchPillars');
    if (pillarsEl) {
      pillarsEl.innerHTML = (fort.architecturalPillars || []).map(function(p, idx) {
        const icons = ['🛡️', '🏛️', '💧'];
        return '<div class="bg-white rounded-xl p-4 border border-stone-200/90 shadow-sm flex flex-col justify-between">' +
          '<div>' +
            '<div class="w-8 h-8 rounded-lg bg-[#f4f0e6] text-[#13261b] flex items-center justify-center text-sm mb-2.5 border border-stone-200">' + icons[idx % icons.length] + '</div>' +
            '<h4 class="font-serif-title font-bold text-sm text-[#13261b] mb-1.5">' + p.title + '</h4>' +
            '<p class="text-xs text-stone-600 leading-relaxed">' + p.desc + '</p>' +
          '</div>' +
          '<div class="mt-3 pt-2 border-t border-stone-100 text-[9px] font-bold uppercase tracking-wider text-amber-800">' + p.meta + '</div>' +
        '</div>';
      }).join('');
    }

    // Infobox & Quote
    const infoEl = document.getElementById('detailInfoboxCard');
    if (infoEl && fort.infobox) {
      infoEl.innerHTML =
        '<div class="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm">' +
          '<div class="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">' +
            '<div class="flex items-center gap-2">' +
              '<img src="' + window.FORT_PIN_ICON_URI + '" alt="Icon" class="w-6 h-6 object-contain" />' +
              '<span class="text-[11px] font-bold uppercase tracking-wider text-[#13261b]">ARCHIVAL DOSSIER</span>' +
            '</div>' +
            '<span class="px-2 py-0.5 rounded bg-[#eab308] text-[#13261b] font-bold text-[10px]">' + fort.lat.toFixed(4) + '° N, ' + fort.lng.toFixed(4) + '° E</span>' +
          '</div>' +
          '<dl class="space-y-2.5 text-xs">' +
            '<div class="flex justify-between gap-3 py-1 border-b border-stone-100"><dt class="text-stone-500 font-medium">Historic Names</dt><dd class="font-semibold text-right text-[#13261b]">' + fort.infobox.otherNames + '</dd></div>' +
            '<div class="flex justify-between gap-3 py-1 border-b border-stone-100"><dt class="text-stone-500 font-medium">Chief Architect</dt><dd class="font-semibold text-right text-[#13261b]">' + fort.infobox.architect + '</dd></div>' +
            '<div class="flex justify-between gap-3 py-1 border-b border-stone-100"><dt class="text-stone-500 font-medium">Sovereign Rule</dt><dd class="font-semibold text-right text-[#13261b]">' + fort.infobox.rulingDynasty + '</dd></div>' +
            '<div class="flex justify-between gap-3 py-1 border-b border-stone-100"><dt class="text-stone-500 font-medium">Preservation</dt><dd class="font-semibold text-right text-emerald-800">' + fort.infobox.preservation + '</dd></div>' +
            '<div class="flex justify-between gap-3 pt-1"><dt class="text-stone-500 font-medium">Primary Sources</dt><dd class="text-right"><a href="' + fort.wikiUrl + '" target="_blank" rel="noopener noreferrer" class="text-[#ca8a04] hover:underline font-semibold">Wikipedia</a> · <a href="' + fort.commonsUrl + '" target="_blank" rel="noopener noreferrer" class="text-[#ca8a04] hover:underline font-semibold">Wikimedia</a></dd></div>' +
          '</dl>' +
        '</div>' +
        '<div class="bg-[#13261b] text-[#faf8f3] rounded-2xl p-5 border border-[#eab308]/40 shadow-md">' +
          '<p class="font-serif-title italic text-sm text-[#facc15] leading-relaxed">"' + fort.infobox.quote + '"</p>' +
          '<p class="text-[10px] uppercase tracking-widest text-stone-300 mt-2.5 font-semibold">— ' + fort.infobox.quoteAuthor + '</p>' +
        '</div>';
    }

    // Key Historical Sites Grid (matching Screen 1)
    const sitesGrid = document.getElementById('detailSitesGrid');
    if (sitesGrid) {
      sitesGrid.innerHTML = (fort.sites || []).map(function(s, i) {
        return '<div class="heritage-card bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm flex flex-col">' +
          '<div class="relative h-48 bg-[#13261b] overflow-hidden cursor-pointer group" onclick="window.openSiteLightbox(\'' + fort.id + '\', ' + i + ')">' +
            '<img src="' + s.image + '" alt="' + s.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />' +
            '<div class="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"></div>' +
            '<span class="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#13261b]/90 text-[#facc15] font-bold text-[10px] uppercase tracking-wider border border-[#eab308]/40">' + s.badge + '</span>' +
            '<span class="absolute bottom-2.5 right-3 px-2 py-0.5 rounded bg-black/60 text-white text-[10px]">🔍 Enlarge Real Photo</span>' +
          '</div>' +
          '<div class="p-4 flex-1 flex flex-col justify-between">' +
            '<div>' +
              '<h4 class="font-serif-title font-bold text-base text-[#13261b]">' + s.name + '</h4>' +
              '<p class="text-[11px] font-semibold text-amber-800 mt-0.5 mb-2">' + s.subtitle + '</p>' +
              '<p class="text-xs text-stone-600 leading-relaxed mb-3">' + s.desc + '</p>' +
            '</div>' +
            '<div class="flex items-center justify-between pt-2.5 border-t border-stone-100 text-[11px] text-stone-500 font-medium">' +
              '<span>📍 ' + s.loc + '</span>' +
              '<span>⛰️ ' + s.elev + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Historical Timeline (Epochs of the Fort - matching Screen 1)
    const tlHeading = document.getElementById('detailTimelineHeading');
    if (tlHeading) tlHeading.textContent = 'Epochs of ' + fort.name;
    const tlList = document.getElementById('detailTimelineList');
    if (tlList) {
      tlList.innerHTML = (fort.timeline || []).map(function(t) {
        if (t.highlight) {
          return '<div class="relative pl-8 pb-6 border-l-2 border-[#eab308]">' +
            '<div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#eab308] ring-4 ring-[#eab308]/30"></div>' +
            '<div class="bg-[#13261b] text-white rounded-xl p-4 sm:p-5 shadow-lg border border-[#eab308]">' +
              '<div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">' +
                '<h4 class="font-serif-title font-bold text-base text-[#facc15]">' + t.title + '</h4>' +
                '<span class="px-2.5 py-0.5 rounded bg-[#eab308] text-[#13261b] font-bold text-[10px] uppercase tracking-wider">' + t.badge + '</span>' +
              '</div>' +
              '<p class="text-xs text-stone-200 leading-relaxed">' + t.desc + '</p>' +
            '</div>' +
          '</div>';
        }
        return '<div class="relative pl-8 pb-6 border-l-2 border-[#eab308]/50 last:pb-0">' +
          '<div class="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#ca8a04]"></div>' +
          '<div class="bg-white rounded-xl p-4 border border-stone-200/90 shadow-sm">' +
            '<div class="flex flex-wrap items-center justify-between gap-2 mb-1">' +
              '<h4 class="font-serif-title font-bold text-sm sm:text-base text-[#13261b]">' + t.title + '</h4>' +
              '<span class="px-2 py-0.5 rounded bg-[#f4f0e6] text-stone-700 font-semibold text-[10px] uppercase tracking-wider border border-stone-300">' + t.badge + '</span>' +
            '</div>' +
            '<p class="text-xs text-stone-600 leading-relaxed">' + t.desc + '</p>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Ascent Routes Cards
    const routesGrid = document.getElementById('detailRoutesGrid');
    if (routesGrid) {
      routesGrid.innerHTML = (fort.routes || []).map(function(r) {
        const btnAction = r.primary && r.title.indexOf('Ropeway') !== -1
          ? 'window.openRopewayModal(\'' + fort.id + '\')'
          : 'window.downloadFortGPX(\'' + fort.id + '\')';
        const btnStyle = r.primary
          ? 'bg-[#eab308] hover:bg-[#ca8a04] text-[#13261b]'
          : 'bg-[#13261b] hover:bg-[#254734] text-white';
        return '<div class="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">' +
          '<div>' +
            '<div class="flex items-center justify-between gap-2 mb-2.5">' +
              '<span class="px-2.5 py-0.5 rounded bg-[#eab308]/25 text-amber-900 font-bold text-[10px] uppercase tracking-wider">' + r.badge + '</span>' +
              '<span class="text-[11px] font-semibold text-stone-500">' + r.gradeLabel + '</span>' +
            '</div>' +
            '<h4 class="font-serif-title font-bold text-base text-[#13261b] mb-1.5">' + r.title + '</h4>' +
            '<p class="text-xs text-stone-600 leading-relaxed mb-4">' + r.desc + '</p>' +
            '<div class="grid grid-cols-2 gap-2.5 bg-[#f4f0e6] rounded-xl p-3 mb-4 text-xs border border-stone-200/70">' +
              '<div><span class="block text-[9px] uppercase text-stone-500 font-semibold">DISTANCE</span><span class="font-bold text-[#13261b]">' + r.distance + '</span></div>' +
              '<div><span class="block text-[9px] uppercase text-stone-500 font-semibold">DURATION</span><span class="font-bold text-[#13261b]">' + r.duration + '</span></div>' +
              '<div><span class="block text-[9px] uppercase text-stone-500 font-semibold">ELEVATION GAIN</span><span class="font-bold text-[#13261b]">' + r.gain + '</span></div>' +
              '<div><span class="block text-[9px] uppercase text-stone-500 font-semibold">WATER / REFRESH</span><span class="font-bold text-[#13261b]">' + r.water + '</span></div>' +
            '</div>' +
          '</div>' +
          '<button onclick="' + btnAction + '" class="w-full py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sm ' + btnStyle + '">' +
            r.cta +
          '</button>' +
        '</div>';
      }).join('');
    }

    // SVG Elevation Profile Chart
    const chartBox = document.getElementById('detailElevationSvgBox');
    if (chartBox && fort.elevationProfile && fort.elevationProfile.length > 1) {
      const pts = fort.elevationProfile;
      const maxE = Math.max.apply(null, pts.map(function(p) { return p.elev; })) || 1000;
      const minE = Math.min.apply(null, pts.map(function(p) { return p.elev; })) || 0;
      const span = Math.max(maxE - minE, 20);
      const w = 640;
      const h = 150;
      const padX = 40;
      const padY = 24;
      const coords = pts.map(function(p, idx) {
        const x = padX + (idx / (pts.length - 1)) * (w - padX * 2);
        const y = h - padY - ((p.elev - minE) / span) * (h - padY * 2);
        return { x: x, y: y, label: p.label, elev: p.elev };
      });
      const polyPoints = coords.map(function(c) { return c.x.toFixed(1) + ',' + c.y.toFixed(1); }).join(' ');
      const areaPoints = coords[0].x.toFixed(1) + ',' + (h - padY) + ' ' + polyPoints + ' ' + coords[coords.length - 1].x.toFixed(1) + ',' + (h - padY);

      const circles = coords.map(function(c) {
        return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="4.5" fill="#13261b" stroke="#eab308" stroke-width="2.5" />' +
               '<text x="' + c.x.toFixed(1) + '" y="' + (c.y - 9).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#13261b">' + c.elev + 'm</text>';
      }).join('');

      const labelsHtml = pts.map(function(p) {
        return '<div class="text-[10px] font-semibold text-stone-600 text-center">' + p.label + '</div>';
      }).join('');

      chartBox.innerHTML =
        '<svg viewBox="0 0 ' + w + ' ' + h + '" class="w-full h-36 overflow-visible">' +
          '<defs>' +
            '<linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#eab308" stop-opacity="0.45"/>' +
              '<stop offset="100%" stop-color="#eab308" stop-opacity="0.03"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<line x1="' + padX + '" y1="' + (h - padY) + '" x2="' + (w - padX) + '" y2="' + (h - padY) + '" stroke="#d6cbb5" stroke-width="1" />' +
          '<polygon points="' + areaPoints + '" fill="url(#elevGrad)" />' +
          '<polyline fill="none" stroke="#ca8a04" stroke-width="3" points="' + polyPoints + '" />' +
          circles +
        '</svg>' +
        '<div class="grid grid-cols-' + pts.length + ' gap-1 mt-2 pt-2 border-t border-stone-200">' + labelsHtml + '</div>';
    }

    // Connected Maratha Fortresses (matching Screen 1 bottom cards)
    const connGrid = document.getElementById('detailConnectedGrid');
    if (connGrid) {
      const connIds = fort.connectedForts || ['rajgad', 'torna', 'pratapgad'];
      connGrid.innerHTML = connIds.map(function(cid) {
        const cf = findFort(cid);
        return '<div onclick="window.openFortDetail(\'' + cf.id + '\')" class="heritage-card bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm cursor-pointer flex flex-col">' +
          '<div class="relative h-36 bg-[#13261b] overflow-hidden">' +
            '<img src="' + cf.image + '" alt="' + cf.name + '" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition duration-500" />' +
            '<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>' +
            '<span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#13261b]/90 text-[#facc15] font-bold text-[9px] uppercase tracking-wider">' + cf.categoryBadge + '</span>' +
            '<img src="' + window.FORT_PIN_ICON_URI + '" alt="Pin" class="w-7 h-7 object-contain absolute bottom-2 right-2.5 drop-shadow" />' +
          '</div>' +
          '<div class="p-4 flex-1 flex flex-col justify-between">' +
            '<div>' +
              '<h4 class="font-serif-title font-bold text-base text-[#13261b]">' + cf.name + ' <span class="font-marathi text-xs text-amber-900">(' + cf.marathiName + ')</span></h4>' +
              '<p class="text-[11px] text-amber-800 font-medium mt-0.5 mb-1.5">' + cf.mapSubtitle + '</p>' +
              '<p class="text-xs text-stone-600 line-clamp-2">' + cf.shortDesc + '</p>' +
            '</div>' +
            '<div class="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 text-[11px] font-semibold text-[#13261b]">' +
              '<span>Altitude: ' + (cf.elevationMeters > 50 ? cf.elevationMeters + ' m' : 'Sea Level') + '</span>' +
              '<span class="text-[#ca8a04]">Explore Citadel →</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Update Interactive Trailhead Mini-Map on Fort Detail Page
    if (typeof window.L !== 'undefined') {
      const miniBox = document.getElementById('detailTrailheadMapCanvas');
      if (miniBox) {
        if (!detailLeafletMap) {
          detailLeafletMap = window.L.map(miniBox, {
            center: [fort.lat, fort.lng],
            zoom: 12,
            zoomControl: true,
            scrollWheelZoom: false
          });
          window.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenTopoMap',
            maxZoom: 16
          }).addTo(detailLeafletMap);
        } else {
          detailLeafletMap.setView([fort.lat, fort.lng], 12);
        }
        if (detailLeafletMarker) {
          detailLeafletMap.removeLayer(detailLeafletMarker);
        }
        const miniPinHtml =
          '<div class="custom-leaflet-pin is-active-pin">' +
            '<img src="' + window.FORT_PIN_ICON_URI + '" alt="' + fort.name + '" style="width:38px;height:42px;object-fit:contain;" />' +
            '<span class="px-1.5 py-0.5 rounded bg-[#13261b] text-[#facc15] font-bold text-[9px] whitespace-nowrap shadow">' + fort.name + '</span>' +
          '</div>';
        const miniIcon = window.L.divIcon({
          className: 'leaflet-div-icon',
          html: miniPinHtml,
          iconSize: [70, 56],
          iconAnchor: [35, 46]
        });
        detailLeafletMarker = window.L.marker([fort.lat, fort.lng], { icon: miniIcon }).addTo(detailLeafletMap);
        const coordLabel = document.getElementById('detailMiniMapCoords');
        if (coordLabel) {
          coordLabel.textContent = fort.baseVillage + ' · ' + fort.lat.toFixed(4) + '° N, ' + fort.lng.toFixed(4) + '° E';
        }
        refreshLeafletSize();
      }
    }
  }

  // ==========================================
  // EXPLORE ALL FORTS DIRECTORY PAGE
  // ==========================================
  window.filterDirectory = function(field, val) {
    if (field === 'region') window.appState.dirRegion = val;
    if (field === 'type') window.appState.dirType = val;
    if (field === 'grade') window.appState.dirGrade = val;
    if (field === 'search') window.appState.dirSearch = val;
    renderExploreDirectory();
  };

  function renderExploreDirectory() {
    const grid = document.getElementById('exploreDirectoryGrid');
    if (!grid) return;
    const reg = window.appState.dirRegion;
    const typ = window.appState.dirType;
    const grd = window.appState.dirGrade;
    const q = (window.appState.dirSearch || '').toLowerCase().trim();

    const list = getForts().filter(function(f) {
      const mReg = (reg === 'All') || (f.district.toLowerCase() === reg.toLowerCase());
      const mTyp = (typ === 'All') || (f.type.toLowerCase().indexOf(typ.toLowerCase()) !== -1);
      const mGrd = (grd === 'All') || (f.grade.toLowerCase() === grd.toLowerCase());
      const mQ = !q || f.name.toLowerCase().indexOf(q) !== -1 || f.marathiName.indexOf(q) !== -1 || f.district.toLowerCase().indexOf(q) !== -1;
      return mReg && mTyp && mGrd && mQ;
    });

    const countBadge = document.getElementById('exploreCountBadge');
    if (countBadge) countBadge.textContent = list.length + ' Citadels Found';

    if (list.length === 0) {
      grid.innerHTML = '<div class="col-span-full bg-white rounded-2xl p-8 text-center border border-stone-200">' +
        '<p class="font-serif-title text-lg font-bold text-[#13261b]">No matching forts found</p>' +
        '<p class="text-xs text-stone-500 mt-1 mb-4">Try clearing your region or trek difficulty filters to browse all 12 Maharashtra forts.</p>' +
        '<button onclick="window.quickFilterExplore(\'region\', \'All\')" class="px-4 py-2 rounded-lg bg-[#eab308] text-[#13261b] font-bold text-xs">Reset All Filters</button>' +
      '</div>';
      return;
    }

    grid.innerHTML = list.map(function(f) {
      return '<div class="heritage-card bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm flex flex-col">' +
        '<div class="relative h-48 bg-[#13261b] overflow-hidden cursor-pointer group" onclick="window.openFortDetail(\'' + f.id + '\')">' +
          '<img src="' + f.image + '" alt="' + f.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />' +
          '<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"></div>' +
          '<span class="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#eab308] text-[#13261b] font-bold text-[10px] uppercase">' + f.categoryBadge + '</span>' +
          '<button onclick="window.toggleBookmark(\'' + f.id + '\', event)" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-[#eab308] hover:text-[#13261b] flex items-center justify-center text-xs">' +
            (window.isBookmarked(f.id) ? '★' : '☆') +
          '</button>' +
          '<div class="absolute bottom-2.5 left-3 right-3 flex justify-between items-center text-white text-xs">' +
            '<span class="font-semibold">📍 ' + f.district + '</span>' +
            '<span class="font-marathi text-amber-200">' + f.marathiName + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="p-4 flex-1 flex flex-col justify-between">' +
          '<div>' +
            '<div class="flex items-center justify-between text-[11px] text-stone-500 mb-1">' +
              '<span>' + f.type + '</span>' +
              '<span class="font-bold text-amber-800">Grade: ' + f.grade + '</span>' +
            '</div>' +
            '<h3 class="font-serif-title font-bold text-lg text-[#13261b] cursor-pointer hover:text-[#ca8a04]" onclick="window.openFortDetail(\'' + f.id + '\')">' + f.name + '</h3>' +
            '<p class="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed mb-3">' + f.shortDesc + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-2 pt-3 border-t border-stone-100">' +
            '<button onclick="window.openFortDetail(\'' + f.id + '\')" class="flex-1 py-2 rounded-lg bg-[#13261b] hover:bg-[#254734] text-[#facc15] font-semibold text-xs transition">Full Dossier →</button>' +
            '<button onclick="window.selectMapFort(\'' + f.id + '\'); window.navigatePage(\'map\');" class="px-3 py-2 rounded-lg bg-[#f4f0e6] hover:bg-[#eab308] text-[#13261b] font-semibold text-xs transition border border-stone-300" title="Locate on Fort Map">Map ⌖</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ==========================================
  // REAL PHOTOGRAPHIC GALLERY RENDERER
  // ==========================================
  function renderGalleryGrid() {
    const gGrid = document.getElementById('realPhotoGalleryGrid');
    if (!gGrid) return;
    const photos = [];
    getForts().forEach(function(f) {
      photos.push({
        fortId: f.id,
        title: f.name + ' (' + f.marathiName + ')',
        sub: f.district + ' District · ' + f.elevationDisplay,
        img: f.image,
        wiki: f.commonsUrl
      });
      (f.sites || []).forEach(function(s) {
        if (s.image && s.image !== f.image) {
          photos.push({
            fortId: f.id,
            title: s.name,
            sub: f.name + ' · ' + s.subtitle,
            img: s.image,
            wiki: f.commonsUrl
          });
        }
      });
    });

    gGrid.innerHTML = photos.map(function(p) {
      return '<div class="heritage-card bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm flex flex-col">' +
        '<div class="relative h-52 bg-[#13261b] overflow-hidden group cursor-pointer" onclick="window.openFortDetail(\'' + p.fortId + '\')">' +
          '<img src="' + p.img + '" alt="' + p.title + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />' +
          '<span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 text-[#facc15] font-semibold text-[10px]">Real Archival Photograph</span>' +
        '</div>' +
        '<div class="p-3.5 flex items-center justify-between gap-2">' +
          '<div class="min-w-0">' +
            '<h4 class="font-serif-title font-bold text-sm text-[#13261b] truncate">' + p.title + '</h4>' +
            '<p class="text-[11px] text-stone-500 truncate">' + p.sub + '</p>' +
          '</div>' +
          '<a href="' + p.wiki + '" target="_blank" rel="noopener noreferrer" class="shrink-0 px-2.5 py-1 rounded bg-[#f4f0e6] hover:bg-[#eab308] text-[#13261b] font-semibold text-[10px] border border-stone-300">Commons ↗</a>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ==========================================
  // GPX DOWNLOADS, AUDIO GUIDE & MODALS
  // ==========================================
  window.downloadFortGPX = function(fortId) {
    const f = findFort(fortId || window.appState.currentFortId);
    const gpx = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<gpx version="1.1" creator="Shivdurg Sahyadri Fort Heritage" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '  <metadata><name>' + f.name + ' Trek Route</name><desc>' + f.shortDesc + '</desc></metadata>\n' +
      '  <wpt lat="' + f.lat + '" lon="' + f.lng + '"><ele>' + f.elevationMeters + '</ele><name>' + f.name + ' (' + f.marathiName + ')</name></wpt>\n' +
      '</gpx>';
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.id + '-sahyadri-trek.gpx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    window.showToast('GPX Waypoint Downloaded', 'Saved ' + f.id + '-sahyadri-trek.gpx (' + f.lat + '°N, ' + f.lng + '°E) for offline navigation.');
  };

  window.downloadAllGPX = function() {
    const wpts = getForts().map(function(f) {
      return '  <wpt lat="' + f.lat + '" lon="' + f.lng + '"><ele>' + f.elevationMeters + '</ele><name>' + f.name + '</name><desc>' + f.district + ' - ' + f.grade + '</desc></wpt>';
    }).join('\n');
    const gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Shivdurg Sahyadri Fort Heritage">\n' + wpts + '\n</gpx>';
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maharashtra-sahyadri-forts-circuit.gpx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    window.showToast('Complete Sahyadri GPX Pack Exported', 'Downloaded all Maharashtra Fort GPS waypoints (maharashtra-sahyadri-forts-circuit.gpx).');
  };

  window.toggleAudioGuide = function() {
    const f = findFort(window.appState.currentFortId);
    const btn = document.getElementById('audioGuideBtnLabel');
    if (window.appState.audioPlaying) {
      window.appState.audioPlaying = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (btn) btn.textContent = '🎧 Audio Guide';
      window.showToast('Audio Guide Paused', 'Stopped heritage narration for ' + f.name + '.');
      return;
    }

    window.appState.audioPlaying = true;
    if (btn) btn.textContent = '⏸ Stop Audio';

    // Play gentle Web Audio heritage chime
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      }
    } catch (e) {}

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(f.name + '. ' + f.overviewTitle + '. ' + f.overviewP1);
        utter.rate = 0.96;
        utter.onend = function() {
          window.appState.audioPlaying = false;
          if (btn) btn.textContent = '🎧 Audio Guide';
        };
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }
    window.showToast('Playing Heritage Audio Guide', 'Narrating history of ' + f.name + ' (' + f.marathiName + ').');
  };

  // Modal System
  function openModalWithHtml(title, bodyHtml) {
    const modal = document.getElementById('universalModal');
    const mTitle = document.getElementById('universalModalTitle');
    const mBody = document.getElementById('universalModalBody');
    if (!modal || !mTitle || !mBody) return;
    mTitle.textContent = title;
    mBody.innerHTML = bodyHtml;
    modal.classList.remove('hidden');
  }

  window.closeModal = function() {
    const modal = document.getElementById('universalModal');
    if (modal) modal.classList.add('hidden');
  };

  window.openSavedModal = function() {
    const items = savedForts.map(function(id) { return findFort(id); }).filter(Boolean);
    if (items.length === 0) {
      openModalWithHtml('Saved Expedition Forts (0)', '<p class="text-xs text-stone-600 py-4">You have not bookmarked any forts yet. Click the ★ icon on any fort card to build your Sahyadri trek list.</p>');
      return;
    }
    const listHtml = '<div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">' +
      items.map(function(f) {
        return '<div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#f4f0e6] border border-stone-200">' +
          '<div class="flex items-center gap-3 min-w-0">' +
            '<img src="' + f.image + '" alt="' + f.name + '" class="w-14 h-12 rounded-lg object-cover shrink-0" />' +
            '<div class="min-w-0">' +
              '<h4 class="font-serif-title font-bold text-sm text-[#13261b] truncate">' + f.name + ' (' + f.marathiName + ')</h4>' +
              '<p class="text-[11px] text-stone-600">' + f.district + ' · ' + f.elevationDisplay + ' · ' + f.grade + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0">' +
            '<button onclick="window.closeModal(); window.openFortDetail(\'' + f.id + '\');" class="px-2.5 py-1.5 rounded-lg bg-[#13261b] text-[#facc15] font-semibold text-xs">Open</button>' +
            '<button onclick="window.toggleBookmark(\'' + f.id + '\', event); window.openSavedModal();" class="px-2 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs">✕</button>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>' +
      '<div class="mt-4 pt-3 border-t border-stone-200 flex justify-between items-center">' +
        '<span class="text-xs text-stone-500">' + items.length + ' citadels in your backpack</span>' +
        '<button onclick="window.downloadAllGPX()" class="px-4 py-2 rounded-lg bg-[#eab308] text-[#13261b] font-bold text-xs">Export Saved GPX Pack</button>' +
      '</div>';
    openModalWithHtml('Saved Sahyadri Citadels (' + items.length + ')', listHtml);
  };

  window.openRopewayModal = function(fortId) {
    const f = findFort(fortId || window.appState.currentFortId);
    const html =
      '<form onsubmit="window.submitRopewayBooking(event)" class="space-y-3 text-xs">' +
        '<div class="p-3 rounded-xl bg-[#f4f0e6] border border-stone-200">' +
          '<p class="font-bold text-[#13261b] text-sm">' + f.name + ' (' + f.marathiName + ') — Expedition & Ropeway Pass</p>' +
          '<p class="text-stone-600 mt-0.5">Base Village: ' + f.baseVillage + ' · Operating Hours: 08:00 AM – 05:30 PM</p>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
          '<div><label class="block font-semibold text-stone-700 mb-1">Trekker / Group Lead Name</label><input type="text" required placeholder="e.g., Rohan Deshmukh" class="w-full px-3 py-2 rounded-lg border border-stone-300" /></div>' +
          '<div><label class="block font-semibold text-stone-700 mb-1">Visit Date</label><input type="date" required value="2026-11-15" class="w-full px-3 py-2 rounded-lg border border-stone-300" /></div>' +
          '<div><label class="block font-semibold text-stone-700 mb-1">Pass Type</label><select class="w-full px-3 py-2 rounded-lg border border-stone-300"><option>Two-Way Aerial Ropeway + ASI Entry (₹350)</option><option>One-Way Ropeway Ascent (₹220)</option><option>ASI Heritage Citadel Entry Only (₹25)</option></select></div>' +
          '<div><label class="block font-semibold text-stone-700 mb-1">Number of Trekkers</label><input type="number" min="1" max="20" value="2" required class="w-full px-3 py-2 rounded-lg border border-stone-300" /></div>' +
        '</div>' +
        '<div class="pt-2 flex justify-end gap-2">' +
          '<button type="button" onclick="window.closeModal()" class="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-semibold">Cancel</button>' +
          '<button type="submit" class="px-5 py-2 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-[#13261b] font-bold">Confirm Pass Reservation</button>' +
        '</div>' +
      '</form>';
    openModalWithHtml('Reserve Ropeway & ASI Heritage Pass', html);
  };

  window.submitRopewayBooking = function(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    window.closeModal();
    window.showToast('Pass Reservation Confirmed', 'Your QR boarding pass and ASI monument entry voucher have been generated.');
  };

  window.openMonsoonModal = function() {
    const html =
      '<div class="space-y-3 text-xs text-stone-700 leading-relaxed">' +
        '<div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">' +
          '<p class="font-bold text-sm">⚠️ Sahyadri Monsoon Trekking Advisory (June – September)</p>' +
          '<p class="mt-1">Basalt rock steps on Raigad, Lohagad, Visapur, Harishchandragad, and Torna develop moss (शेवाळ) and experience sudden cloudburst flash streams.</p>' +
        '</div>' +
        '<ul class="list-disc pl-5 space-y-1.5">' +
          '<li><strong>Footwear:</strong> Wear high-grip vibram or rubber-studded trekking shoes; avoid smooth-soled sneakers.</li>' +
          '<li><strong>Wind & Cliff Safety:</strong> Stay at least 15 feet back from Takmak Tok, Konkan Kada, and Vinchu Kata edges during 60+ km/h ridge gusts.</li>' +
          '<li><strong>Start Early:</strong> Begin ascents before 06:30 AM and descend off exposed machis before 04:30 PM.</li>' +
          '<li><strong>Leave No Trace:</strong> Carry back all plastic bottles and wrappers; respect sacred temples and memorials.</li>' +
        '</ul>' +
      '</div>';
    openModalWithHtml('Sahyadri Monsoon Safety & Ridge Advisory', html);
  };

  window.openSiteLightbox = function(fortId, siteIdx) {
    const f = findFort(fortId);
    const s = (f.sites || [])[siteIdx];
    if (!s) return;
    const html =
      '<div class="space-y-3">' +
        '<div class="rounded-xl overflow-hidden bg-black max-h-96 flex items-center justify-center">' +
          '<img src="' + s.image + '" alt="' + s.name + '" class="w-full max-h-96 object-contain" />' +
        '</div>' +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<div>' +
            '<h4 class="font-serif-title font-bold text-base text-[#13261b]">' + s.name + '</h4>' +
            '<p class="text-xs text-amber-800 font-semibold">' + s.subtitle + ' · ' + s.loc + ' (' + s.elev + ')</p>' +
          '</div>' +
          '<a href="' + f.commonsUrl + '" target="_blank" rel="noopener noreferrer" class="px-3 py-1 rounded-lg bg-[#f4f0e6] text-[#13261b] font-semibold text-xs border border-stone-300">Wikimedia Commons Source ↗</a>' +
        '</div>' +
        '<p class="text-xs text-stone-600 leading-relaxed">' + s.desc + '</p>' +
      '</div>';
    openModalWithHtml(f.name + ' — Archival Site View', html);
  };

  window.submitNewsletter = function(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const inp = document.getElementById('footerEmailInput');
    const email = inp ? inp.value.trim() : '';
    if (inp) inp.value = '';
    window.showToast('Joined Sahyadri Conservation Guard', 'Subscribed ' + (email || 'your email') + ' to monthly fort restoration & trail dispatches.');
  };

  window.submitContactForm = function(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const form = ev.target;
    if (form && form.reset) form.reset();
    window.showToast('Dispatch Received', 'Thank you! The Shivdurg Heritage & Trekking Alliance team will respond within 24 hours.');
  };

  function renderAllDynamicViews() {
    updateBookmarkBadge();
    renderHomeFeatured();
    renderMapSidebarAndPins();
    renderFortDetailPage();
    renderExploreDirectory();
    renderGalleryGrid();
  }

  window.addEventListener('DOMContentLoaded', function() {
    renderAllDynamicViews();
  });
})();
