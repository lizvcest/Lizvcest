(function () {
	'use strict';

	var NOTES_KEY = 'liz-notes';

	// Datos de la ventana instagram.exe. Instagram no deja leer perfiles sin
	// sesión, así que hay dos formas de llenar el feed:
	//   1. elfsightId: el ID del widget "Instagram Feed" de elfsight.com (el
	//      texto tras "elfsight-app-"). Se actualiza solo, como en wetlegband.com.
	//   2. posts: a mano. Cada post:
	//      { image: 'ruta/foto.jpg', url: 'https://www.instagram.com/p/...',
	//        alt: 'descripción', type: 'image' | 'carousel' | 'video',
	//        likes: '1.2K', comments: '34' }
	// Los campos vacíos no se muestran.
	var INSTAGRAM = {
		user: 'doiknowyou.anyway',
		url: 'https://www.instagram.com/doiknowyou.anyway/?hl=es',
		avatar: '',
		name: 'Liz',
		bio: '',
		stats: { posts: '14', followers: '1.1K', following: '336' },
		elfsightId: '582b4932-a608-4762-86b9-8d7287530fd7',
		posts: []
	};

	var ELFSIGHT_SCRIPT = 'https://elfsightcdn.com/platform.js';

	var INSTA_ICONS = {
		carousel: '<svg viewBox="0 0 24 24" aria-label="Carrusel"><path d="M7 3h12a2 2 0 0 1 2 2v12h-2V5H7z"/><rect x="3" y="7" width="14" height="14" rx="2"/></svg>',
		video: '<svg viewBox="0 0 24 24" aria-label="Video"><path d="M7 4.5v15L19.5 12z"/></svg>',
		likes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
		comments: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21.5l4.4-2.2c1.1.4 2.3.6 3.6.6 5.5 0 10-3.8 10-8.4S17.5 3 12 3z"/></svg>'
	};

	// Cada app abre una ventana (salvo Clippy, que es un agente flotante).
	var apps = {
		notepad: {
			title: 'Notas',
			icon: 'sources/notepad-96.png',
			width: 440,
			height: 320,
			init: initNotepad
		},
		cv: {
			title: 'CV - Lizbeth Velázquez',
			iconClass: 'icon-cv',
			width: 960,
			height: 640
		},
		readme: {
			title: 'Leeme.txt - Bloc de notas',
			iconClass: 'icon-file',
			width: 500,
			height: 440
		},
		hobbies: {
			title: 'Hobbies.txt - Bloc de notas',
			iconClass: 'icon-file',
			width: 480,
			height: 420
		},
		instagram: {
			title: 'instagram.exe',
			iconClass: 'icon-instagram',
			width: 400,
			height: 480,
			init: initInstagram
		},
		memes: {
			launch: openMemes
		},
		clippy: {
			launch: function () { clippy.show(); }
		}
	};

	var desktop = document.querySelector('.liz-desktop');
	var taskbarWindows = document.querySelector('.liz-taskbar-windows');
	var startButton = document.querySelector('.liz-taskbar-start-button');
	var startMenu = document.querySelector('.liz-start-menu');
	var windowTemplate = document.getElementById('window-template');

	var openWindows = {};
	var zIndex = 100;
	var cascade = 0;

	// region Windows

	function openApp(id) {
		var app = apps[id];

		if (!app) {
			return;
		}

		if (app.launch) {
			app.launch();
			return;
		}

		openWindow(id, app);
	}

	// Abre una ventana con la configuración { title, icon | iconClass, width,
	// height, init }. El id debe ser único; si ya existe, la trae al frente.
	function openWindow(id, app) {
		if (openWindows[id]) {
			restoreWindow(id);
			return;
		}

		var win = windowTemplate.content.firstElementChild.cloneNode(true);
		var icon = win.querySelector('.liz-window-icon');
		var content = win.querySelector('.liz-window-content');
		var appTemplate = document.getElementById('app-' + id);

		win.dataset.app = id;
		win.querySelector('.liz-window-title').textContent = app.title;
		win.setAttribute('aria-label', app.title);

		if (app.icon) {
			icon.src = app.icon;
		} else {
			icon.removeAttribute('src');
			icon.classList.add(app.iconClass);
		}

		if (appTemplate) {
			content.appendChild(appTemplate.content.cloneNode(true));
		}

		var maxW = window.innerWidth - 20;
		var maxH = window.innerHeight - 60;
		var w = Math.min(app.width, maxW);
		var h = Math.min(app.height, maxH);

		win.style.width = w + 'px';
		win.style.height = h + 'px';
		win.style.left = Math.max(0, Math.min(120 + cascade * 26, window.innerWidth - w)) + 'px';
		win.style.top = Math.max(0, Math.min(40 + cascade * 26, maxH - h)) + 'px';
		cascade = (cascade + 1) % 8;

		document.body.appendChild(win);

		var taskButton = document.createElement('button');
		var taskIcon = document.createElement(app.icon ? 'img' : 'i');

		taskButton.type = 'button';
		taskButton.title = app.title;

		if (app.icon) {
			taskIcon.src = app.icon;
			taskIcon.alt = '';
		} else {
			taskIcon.className = app.iconClass;
		}

		taskButton.appendChild(taskIcon);
		taskButton.appendChild(document.createTextNode(app.title));
		taskButton.addEventListener('click', function () {
			if (win.classList.contains('active') && !win.classList.contains('minimized')) {
				minimizeWindow(id);
			} else {
				restoreWindow(id);
			}
		});
		taskbarWindows.appendChild(taskButton);

		openWindows[id] = { el: win, taskButton: taskButton };

		win.addEventListener('pointerdown', function () { focusWindow(id); });
		win.querySelector('[data-action="minimize"]').addEventListener('click', function () { minimizeWindow(id); });
		win.querySelector('[data-action="maximize"]').addEventListener('click', function () { toggleMaximize(id); });
		win.querySelector('[data-action="close"]').addEventListener('click', function () { closeWindow(id); });
		win.querySelector('.liz-window-titlebar').addEventListener('dblclick', function (e) {
			if (!e.target.closest('button')) {
				toggleMaximize(id);
			}
		});

		makeDraggable(win, win.querySelector('.liz-window-titlebar'), function () {
			return !win.classList.contains('maximized');
		});

		if (app.init) {
			app.init(win);
		}

		focusWindow(id);
	}

	// Un clic dentro de un iframe (como el CV) no llega a la página: se detecta
	// porque la página pierde el foco y el iframe pasa a ser el elemento activo.
	window.addEventListener('blur', function () {
		setTimeout(function () {
			var active = document.activeElement;
			var win = active && active.tagName === 'IFRAME' && active.closest('.liz-window');

			if (win) {
				focusWindow(win.dataset.app);
			}
		}, 0);
	});

	function focusWindow(id) {
		Object.keys(openWindows).forEach(function (key) {
			var active = key === id;
			openWindows[key].el.classList.toggle('active', active);
			openWindows[key].taskButton.classList.toggle('pressed', active);
		});

		if (openWindows[id]) {
			openWindows[id].el.style.zIndex = ++zIndex;
		}
	}

	function restoreWindow(id) {
		openWindows[id].el.classList.remove('minimized');
		focusWindow(id);
	}

	function minimizeWindow(id) {
		var item = openWindows[id];

		item.el.classList.add('minimized');
		item.el.classList.remove('active');
		item.taskButton.classList.remove('pressed');
	}

	function toggleMaximize(id) {
		var win = openWindows[id].el;
		var maximized = win.classList.toggle('maximized');

		win.querySelector('[data-action="maximize"]').title = maximized ? 'Restaurar' : 'Maximizar';
	}

	function closeWindow(id) {
		var item = openWindows[id];

		item.el.remove();
		item.taskButton.remove();
		delete openWindows[id];
	}

	// endregion

	// region Drag (ventanas y Clippy)

	function makeDraggable(el, handle, canDrag) {
		handle.addEventListener('pointerdown', function (e) {
			if (e.button !== 0 || e.target.closest('button') || (canDrag && !canDrag())) {
				return;
			}

			var rect = el.getBoundingClientRect();
			var offsetX = e.clientX - rect.left;
			var offsetY = e.clientY - rect.top;
			var moved = false;

			handle.setPointerCapture(e.pointerId);

			function onMove(ev) {
				// Mantiene siempre visible un trozo para poder recuperarlo.
				var x = Math.min(Math.max(ev.clientX - offsetX, 40 - rect.width), window.innerWidth - 40);
				var y = Math.min(Math.max(ev.clientY - offsetY, 0), window.innerHeight - 60);

				moved = true;
				el.style.left = x + 'px';
				el.style.top = y + 'px';
				el.style.right = 'auto';
				el.style.bottom = 'auto';
			}

			function onUp() {
				handle.removeEventListener('pointermove', onMove);
				handle.removeEventListener('pointerup', onUp);
				handle.removeEventListener('pointercancel', onUp);
				el.dataset.dragged = moved ? '1' : '';
			}

			handle.addEventListener('pointermove', onMove);
			handle.addEventListener('pointerup', onUp);
			handle.addEventListener('pointercancel', onUp);
		});
	}

	// endregion

	// region Desktop icons

	var lastPointerType = 'mouse';

	document.addEventListener('pointerdown', function (e) {
		lastPointerType = e.pointerType;
	}, true);

	function selectIcon(icon) {
		desktop.querySelectorAll('.liz-desktop-icon.selected').forEach(function (el) {
			el.classList.remove('selected');
		});

		if (icon) {
			icon.classList.add('selected');
		}
	}

	desktop.addEventListener('click', function (e) {
		var icon = e.target.closest('.liz-desktop-icon');

		e.preventDefault();
		selectIcon(icon);

		// En pantallas táctiles no hay doble clic: se abre con un toque.
		if (icon && lastPointerType === 'touch') {
			openApp(icon.dataset.app);
		}
	});

	desktop.addEventListener('dblclick', function (e) {
		var icon = e.target.closest('.liz-desktop-icon');

		if (icon) {
			openApp(icon.dataset.app);
		}
	});

	desktop.addEventListener('keydown', function (e) {
		var icon = e.target.closest('.liz-desktop-icon');

		if (icon && e.key === 'Enter') {
			e.preventDefault();
			openApp(icon.dataset.app);
		}
	});

	// endregion

	// region Start menu

	function toggleStartMenu(open) {
		startMenu.hidden = !open;
		startButton.classList.toggle('pressed', open);
		startButton.setAttribute('aria-expanded', String(open));
	}

	startButton.addEventListener('click', function () {
		toggleStartMenu(startMenu.hidden);
	});

	startMenu.addEventListener('click', function (e) {
		var item = e.target.closest('[data-app]');

		if (item) {
			toggleStartMenu(false);
			openApp(item.dataset.app);
		}
	});

	document.addEventListener('pointerdown', function (e) {
		if (!startMenu.hidden && !startMenu.contains(e.target) && !startButton.contains(e.target)) {
			toggleStartMenu(false);
		}
	});

	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			toggleStartMenu(false);
		}
	});

	// endregion

	// region Clock

	var clock = document.querySelector('.liz-taskbar-clock');

	function updateClock() {
		var now = new Date();

		clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		clock.dateTime = now.toISOString();
		clock.title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	}

	updateClock();
	setInterval(updateClock, 10000);

	// endregion

	// region Notepad

	function initNotepad(win) {
		var textarea = win.querySelector('.notepad-text');
		var status = win.querySelector('.notepad-status');
		var timer = null;

		try {
			// Recupera las notas guardadas con la clave anterior ('emuos-lite-notes').
			textarea.value = localStorage.getItem(NOTES_KEY) || localStorage.getItem('emuos-lite-notes') || '';
		} catch (e) {}

		textarea.addEventListener('input', function () {
			status.textContent = 'Escribiendo...';
			clearTimeout(timer);
			timer = setTimeout(function () {
				try {
					localStorage.setItem(NOTES_KEY, textarea.value);
					status.textContent = 'Guardado a las ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				} catch (e) {
					status.textContent = 'No se pudo guardar en este navegador.';
				}
			}, 400);
		});

		setTimeout(function () { textarea.focus(); }, 0);
	}

	// endregion

	// region Memes

	// La lista de imágenes está en memes/memes.js (window.LIZ_MEMES).
	var MEMES_FOLDER = 'memes/';
	var MEME_DELAY = 250;

	function openMemes() {
		var memes = window.LIZ_MEMES || [];

		if (!memes.length) {
			openWindow('memes-empty', {
				title: 'memes',
				iconClass: 'icon-folder',
				width: 380,
				height: 150,
				init: function (win) {
					var message = document.createElement('p');

					message.className = 'memes-empty';
					message.textContent = 'Esta carpeta está vacía... por ahora. Los memes vienen en camino.';
					win.querySelector('.liz-window-content').appendChild(message);
				}
			});
			return;
		}

		// Se van abriendo de a una, en cascada.
		memes.forEach(function (file, i) {
			setTimeout(function () {
				openWindow('meme-' + i, {
					title: file,
					iconClass: 'icon-image',
					width: 420,
					height: 360,
					init: function (win) { initMeme(win, file); }
				});
			}, i * MEME_DELAY);
		});
	}

	function initMeme(win, file) {
		var img = document.createElement('img');

		img.className = 'meme-image';
		img.alt = file;
		img.draggable = false;

		// Ajusta la ventana al tamaño de la imagen, sin pasarse de la pantalla.
		img.addEventListener('load', function () {
			var maxW = Math.min(560, window.innerWidth - 40);
			var maxH = Math.min(460, window.innerHeight - 120);
			var scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);

			win.style.width = Math.max(200, Math.round(img.naturalWidth * scale) + 12) + 'px';
			win.style.height = Math.max(120, Math.round(img.naturalHeight * scale) + 32) + 'px';
		});

		img.addEventListener('error', function () {
			var message = document.createElement('p');

			message.className = 'memes-empty';
			message.textContent = 'No encontré ' + MEMES_FOLDER + file;
			img.replaceWith(message);
		});

		img.src = encodeURI(MEMES_FOLDER + file);
		win.querySelector('.liz-window-content').appendChild(img);
	}

	// endregion

	// region Instagram

	// El widget de Elfsight se crea una sola vez y se reutiliza al reabrir la
	// ventana, para no tener que volver a cargar el script.
	var elfsightWidget = null;

	function externalLink(className, href) {
		var link = document.createElement('a');

		link.className = className;
		link.href = href;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';

		return link;
	}

	function initInstagram(win) {
		var user = win.querySelector('.insta-user');
		var avatar = win.querySelector('.insta-avatar img');
		var stats = win.querySelector('.insta-stats');
		var feed = win.querySelector('.insta-feed');
		var hasStats = false;

		user.href = INSTAGRAM.url;
		user.querySelector('span').textContent = INSTAGRAM.user;
		win.querySelector('.insta-follow').href = INSTAGRAM.url;
		win.querySelector('.insta-name').textContent = INSTAGRAM.name;
		win.querySelector('.insta-bio').textContent = INSTAGRAM.bio;

		if (INSTAGRAM.avatar) {
			avatar.src = INSTAGRAM.avatar;
			avatar.hidden = false;
		}

		stats.querySelectorAll('[data-stat]').forEach(function (item) {
			var value = INSTAGRAM.stats[item.dataset.stat];

			item.querySelector('strong').textContent = value;
			item.hidden = !value;
			hasStats = hasStats || !!value;
		});
		stats.hidden = !hasStats;

		if (INSTAGRAM.elfsightId) {
			if (!elfsightWidget) {
				elfsightWidget = document.createElement('div');
				elfsightWidget.className = 'elfsight-app-' + INSTAGRAM.elfsightId;
				elfsightWidget.setAttribute('data-elfsight-app-lazy', '');

				var script = document.createElement('script');

				script.src = ELFSIGHT_SCRIPT;
				script.async = true;
				document.body.appendChild(script);
			}

			feed.appendChild(elfsightWidget);
			return;
		}

		if (!INSTAGRAM.posts.length) {
			var empty = externalLink('insta-empty', INSTAGRAM.url);

			empty.textContent = 'Ver publicaciones en Instagram';
			feed.appendChild(empty);
			return;
		}

		var grid = document.createElement('div');

		grid.className = 'insta-grid';

		INSTAGRAM.posts.forEach(function (post) {
			var link = externalLink('insta-post', post.url || INSTAGRAM.url);
			var img = document.createElement('img');

			img.src = post.image;
			img.alt = post.alt || '';
			img.loading = 'lazy';
			link.appendChild(img);

			if (INSTA_ICONS[post.type]) {
				var type = document.createElement('span');

				type.className = 'insta-post-type';
				type.innerHTML = INSTA_ICONS[post.type];
				link.appendChild(type);
			}

			// Capa que aparece al pasar el ratón, con likes y comentarios.
			var overlay = document.createElement('span');

			overlay.className = 'insta-post-overlay';

			['likes', 'comments'].forEach(function (key) {
				if (post[key]) {
					var counter = document.createElement('span');

					counter.innerHTML = INSTA_ICONS[key];
					counter.appendChild(document.createTextNode(post[key]));
					overlay.appendChild(counter);
				}
			});

			link.appendChild(overlay);
			grid.appendChild(link);
		});

		feed.appendChild(grid);
	}

	// endregion

	// region Clippy

	var clippy = (function () {
		var root = document.querySelector('.clippy');
		var agent = root.querySelector('.clippy-agent');
		var balloon = root.querySelector('.clippy-balloon');
		var text = root.querySelector('.clippy-balloon-text');
		var chord = document.querySelector('.sound-chord');
		var tips = [
			'Maybe, im your next employee! Wanna see my cv?',
			'El comeback que nadie esperaba, pero todos/as necesitaban. ¿cv, ig o un email?',
			'Algo retro dentro de tanto modernismo. ¿Quieres ver mi cv?',
		];
		var goodbye = 'Byeeesss diva! Nos vemos en tu próximo proyecto.';
		var leaving = false;
		var index = 0;

		// region Animaciones (sprites de clippy/agents/Clippy)

		// Datos de clippy/agents/Clippy/agent.js: cada animación es una lista de
		// cuadros { duration, images: [[x, y]], branching?, exitBranch? } dentro de map.png.
		var data = window.CLIPPY_AGENT_DATA;
		var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		var talkAnimations = ['Explain', 'GetAttention', 'Thinking', 'Wave', 'GestureRight', 'Congratulate'];
		var idleAnimations = data ? Object.keys(data.animations).filter(function (name) {
			return name.indexOf('Idle') === 0;
		}) : [];
		var current = null;
		var pending = null;
		var exiting = false;
		var frameTimer = null;
		var idleTimer = null;
		var exitGuard = null;

		if (data) {
			agent.style.width = data.framesize[0] + 'px';
			agent.style.height = data.framesize[1] + 'px';
		} else {
			// Sin datos de animación: queda la imagen fija de siempre.
			agent.classList.add('static');
		}

		function draw(frame) {
			var image = frame && frame.images && frame.images[0];

			agent.style.backgroundPosition = image ? -image[0] + 'px ' + -image[1] + 'px' : '';
			agent.classList.toggle('blank', !image);
		}

		function nextFrameIndex() {
			var frame = current.frames[current.index];

			// Al interrumpir, toma el atajo de salida si el cuadro lo tiene.
			if (exiting && frame.exitBranch !== undefined) {
				return frame.exitBranch;
			}

			if (frame.branching) {
				var roll = Math.random() * 100;
				var branches = frame.branching.branches;

				for (var i = 0; i < branches.length; i++) {
					if (roll <= branches[i].weight) {
						return branches[i].frameIndex;
					}

					roll -= branches[i].weight;
				}
			}

			return current.index + 1;
		}

		function step() {
			var frame = current.frames[current.index];

			draw(frame);
			frameTimer = setTimeout(function () {
				var nextIndex = nextFrameIndex();

				if (nextIndex >= current.frames.length) {
					finish();
					return;
				}

				current.index = nextIndex;
				step();
			}, frame.duration);
		}

		function start(name, done) {
			clearTimeout(exitGuard);
			exiting = false;
			current = { frames: data.animations[name].frames, index: 0, done: done };
			step();
		}

		function finish() {
			var done = current.done;

			current = null;
			exiting = false;

			if (pending) {
				var nextAnimation = pending;

				pending = null;
				start(nextAnimation.name, nextAnimation.done);
			} else {
				scheduleIdle();
			}

			if (done) {
				done();
			}
		}

		function play(name, done) {
			if (!data || !data.animations[name] || reduceMotion) {
				if (data) {
					draw(data.animations.RestPose.frames[0]);
				}

				if (done) {
					done();
				}

				return;
			}

			clearTimeout(idleTimer);

			if (!current) {
				start(name, done);
				return;
			}

			// Hay una animación en curso: termina por su salida y luego sigue la nueva.
			pending = { name: name, done: done };
			exiting = true;
			clearTimeout(exitGuard);
			exitGuard = setTimeout(function () {
				if (pending && current) {
					clearTimeout(frameTimer);
					finish();
				}
			}, 1500);
		}

		function stopAnimations() {
			clearTimeout(frameTimer);
			clearTimeout(idleTimer);
			clearTimeout(exitGuard);
			current = null;
			pending = null;
			exiting = false;
		}

		// Mientras nadie le habla, hace alguna animación Idle cada pocos segundos.
		function scheduleIdle() {
			clearTimeout(idleTimer);

			if (!idleAnimations.length || reduceMotion) {
				return;
			}

			idleTimer = setTimeout(function () {
				if (!root.hidden && !current && !leaving) {
					play(idleAnimations[Math.floor(Math.random() * idleAnimations.length)]);
				}
			}, 4000 + Math.random() * 6000);
		}

		function gesture() {
			play(talkAnimations[Math.floor(Math.random() * talkAnimations.length)]);
		}

		// endregion

		function say(message) {
			text.textContent = message;
			balloon.hidden = false;
		}

		function next() {
			index = (index + 1) % tips.length;
			say(tips[index]);
			gesture();
		}

		function show() {
			var wasHidden = root.hidden;

			if (wasHidden || leaving) {
				stopAnimations();
				leaving = false;
				root.hidden = false;
				say(tips[index]);
				play('Show', function () {
					play('Greeting');
				});

				try {
					chord.currentTime = 0;
					chord.play().catch(function () {});
				} catch (e) {}
			} else {
				next();
			}
		}

		agent.addEventListener('click', function () {
			// Si se acaba de arrastrar, no cuenta como clic.
			if (root.dataset.dragged) {
				root.dataset.dragged = '';
				return;
			}

			if (leaving) {
				return;
			}

			if (balloon.hidden) {
				say(tips[index]);
				gesture();
			} else {
				next();
			}
		});

		// Se despide con su animación y desaparece; vuelve desde el icono de Clippy.
		function leave() {
			if (leaving) {
				return;
			}

			leaving = true;
			say(goodbye);
			play('GoodBye', function () {
				if (leaving) {
					stopAnimations();
					root.hidden = true;
					leaving = false;
				}
			});
		}

		agent.addEventListener('dblclick', leave);

		root.querySelector('.clippy-balloon-close').addEventListener('click', leave);

		root.querySelector('.clippy-balloon-next').addEventListener('click', function () {
			if (!leaving) {
				next();
			}
		});

		makeDraggable(root, agent);

		return { show: show };
	})();

	// Clippy saluda al cargar.
	setTimeout(clippy.show, 800);

	// endregion
})();
