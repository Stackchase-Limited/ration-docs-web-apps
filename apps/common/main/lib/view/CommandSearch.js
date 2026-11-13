/*
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 *  CommandSearch.js
 *
 *  Ration Docs #1801: command search ("Tell me"). Alt+/ (Ctrl+Option+/ on macOS) opens a small box
 *  that finds the ribbon's buttons and their menu items by caption and hint; Enter switches to the
 *  owning tab and clicks the item the way a mouse click (or an Alt key tip) does.
 *  Opt-in: File > Advanced settings, <prefix>-settings-command-search, off by default.
 *
 *  The ribbon is read from the DOM: every rendered Common.UI.Button keeps itself in its element's
 *  data ('ui-button'), and the panel (or the "More" drop-down) around it names the tab.
 */

define([
    'common/main/lib/component/Button',
    'common/main/lib/component/Menu'
], function () {
    'use strict';

    Common.UI.CommandSearch = _.extend((function () {
        var _owner, _prefix,
            _box = null, _input, _list,
            _index = [], _results = [], _sel = -1,
            _prevFocus = null;

        var maxResults = 50;

        function strings() { return Common.UI.CommandSearch; }

        function plain(s) {
            if (_.isArray(s)) s = s[0];
            return (typeof s == 'string') ? s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
        }

        // "Bold (Ctrl+B)" -> "Bold": the shortcut stays visible in the hint text, not in the path
        function noShortcut(s) {
            return s.replace(/\s*\([^()]*\)\s*$/, '');
        }

        function isHidden(el, stop) {
            for (; el && el !== stop && el.nodeType === 1; el = el.parentNode) {
                if (el.style.display === 'none' || el.classList.contains('hidden') || el.classList.contains('more-box'))
                    return true;
            }
            return false;
        }

        // the panel (or "More" drop-down) of a tab, or the static panel shown next to every tab (Save, Copy, Undo...)
        function panelOf(toolbar, el) {
            return $(el).closest('.panel[data-tab], .more-container[data-tab], .panel.static', toolbar.$el[0])[0];
        }

        function tabCaption(toolbar, tab) {
            var $a = toolbar.$tabs ? toolbar.$tabs.find('> a[data-tab="' + tab + '"]') : $();
            if (!$a.length || $a.parent().css('display') === 'none') return null;
            return plain($a.attr('data-title') || $a.text());
        }

        // All visible ribbon buttons of the toolbar and the items of their menus (sub-menus included).
        function buildIndex(toolbar) {
            var list = [], seen = [], tabs = {};
            if (!toolbar || !toolbar.$el) return list;
            var root = toolbar.$el[0];

            root.querySelectorAll('*').forEach(function (el) {
                if (!$.hasData(el)) return;
                var btn = $(el).data('ui-button');
                if (!btn || seen.indexOf(btn) > -1 || btn.cmpEl[0] !== el) return;
                seen.push(btn);

                var panel = panelOf(toolbar, el),
                    tab = panel && panel.getAttribute('data-tab') || null;
                if (!panel || isHidden(el, panel)) return;
                if (tab) {
                    if (tabs[tab] === undefined) tabs[tab] = tabCaption(toolbar, tab);
                    if (!tabs[tab]) return;
                }

                var hint = plain(btn.options.hint),
                    name = plain(btn.options.caption || btn.caption) || hint;
                if (name) {
                    list.push({ name: name, hint: hint, path: '', tab: tab, tabCaption: tab ? tabs[tab] : '', btn: btn, item: null });
                }

                var addItems = function (menu, path) {
                    if (!menu || !(menu instanceof Common.UI.Menu) || !_.isArray(menu.items)) return;
                    menu.items.forEach(function (item) {
                        if (!(item instanceof Common.UI.MenuItem) || item.caption === '--' || item.visible === false ||
                            item.cmpEl && item.cmpEl[0] && isHidden(item.cmpEl[0], menu.cmpEl && menu.cmpEl[0])) return;
                        var caption = plain(item.caption);
                        if (!caption) return;
                        if (item.menu) {
                            addItems(item.menu, path.concat(caption));
                        } else {
                            list.push({ name: caption, hint: plain(item.options.hint), path: path.join(' \u203a '), tab: tab, tabCaption: tab ? tabs[tab] : '', btn: btn, item: item });
                        }
                    });
                };
                addItems(btn.menu, [noShortcut(name) || '']);
            });
            return list;
        }

        function isDisabled(entry) {
            return !!(entry.btn.isDisabled() || entry.item && entry.item.isDisabled());
        }

        // Every typed word must occur in the name, hint, path or tab; the best come first:
        // name starts with the text, then a word of the name starts with it, then the name contains it.
        function search(list, text) {
            var q = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
            if (!q) return [];
            var words = q.split(' '),
                res = [];
            list.forEach(function (entry, i) {
                var name = entry.name.toLowerCase(),
                    all = [name, entry.hint, entry.path, entry.tabCaption].join(' ').toLowerCase();
                for (var w = 0; w < words.length; w++)
                    if (all.indexOf(words[w]) < 0) return;
                var rank = name.indexOf(q) === 0 ? 0 :
                           (' ' + name).indexOf(' ' + q) > -1 ? 1 :
                           name.indexOf(q) > -1 ? 2 : 3;
                res.push({ entry: entry, rank: rank * 2 + (entry.item ? 1 : 0), i: i });
            });
            res.sort(function (a, b) { return a.rank - b.rank || a.i - b.i; });
            return res.slice(0, maxResults).map(function (r) { return r.entry; });
        }

        function clickEl($el) {
            $el && $el.length && $el.trigger(jQuery.Event('click', {which: 1}));
        }

        function isMenuOpen(btn) {
            return !!(btn.menu && btn.menu.isVisible && btn.menu.isVisible());
        }

        // As a mouse click: switch to the owning tab, open the "More" drop-down when the button was moved
        // there, then click the button (the item's button opens its menu first, then the item is clicked).
        function activate(toolbar, entry) {
            if (!entry || isDisabled(entry)) return false;
            var btn = entry.btn;

            if (entry.tab && !toolbar.isTabActive(entry.tab))
                toolbar.setTab(entry.tab);

            var more = btn.cmpEl.closest('.more-container');
            if (more.length && !more.is(':visible')) {
                var panel = toolbar.$el.find('.panel[data-tab="' + entry.tab + '"]'),
                    moreBtn = panel.find('.more-box .btn-slot').children().first().data('ui-button');
                moreBtn && !moreBtn.pressed && moreBtn.toggle(true);
            }

            var isGroup = btn.cmpEl.hasClass('btn-group');
            if (!entry.item) {
                clickEl(isGroup ? btn.cmpEl.find('button').first() : btn.cmpEl);
            } else {
                if (!isMenuOpen(btn))
                    clickEl(btn.cmpEl.find('[data-toggle^=dropdown]').first());
                clickEl(entry.item.cmpEl.children('a').first());
                isMenuOpen(btn) && btn.menu.hide();
            }
            return true;
        }

        function api() { return _owner && _owner.api; }

        function toolbar() { return _owner && _owner.toolbar; }

        function render() {
            var s = strings();
            _box = $('<div class="cmd-search" role="dialog" aria-label="' + _.escape(s.txtTitle) + '">' +
                        '<input type="text" class="form-control" autocomplete="off" spellcheck="false" role="combobox" ' +
                            'aria-autocomplete="list" aria-expanded="false" aria-controls="cmd-search-list" ' +
                            'placeholder="' + _.escape(s.txtPlaceholder) + '" aria-label="' + _.escape(s.txtTitle) + '">' +
                        '<ul id="cmd-search-list" role="listbox"></ul>' +
                     '</div>');
            _box.css({ position: 'absolute', zIndex: 1050, width: 360, padding: 6, display: 'none',
                       background: 'var(--background-normal)', border: '1px solid var(--border-regular-control)',
                       boxShadow: '0 2px 6px rgba(0,0,0,.25)', borderRadius: 4 });
            _input = _box.find('input').css({ width: '100%' });
            _list = _box.find('ul').css({ listStyle: 'none', margin: '4px 0 0', padding: 0, maxHeight: 320, overflowY: 'auto' });

            _input.on('input', function () { update(); });
            _input.on('keydown', onKeyDown);
            _input.on('blur', function () { _.defer(function () { _box.is(':visible') && !$.contains(_box[0], document.activeElement) && hide(false); }); });
            _list.on('mousedown', function (e) { e.preventDefault(); });
            _list.on('click', 'li[data-index]', function () { choose(parseInt($(this).attr('data-index'))); });
            $(document.body).append(_box);
        }

        function update() {
            _results = search(_index, _input.val());
            _sel = _results.length ? 0 : -1;
            _list.empty();
            if (!_results.length && _input.val().trim()) {
                _list.append($('<li style="padding:4px 8px;color:var(--text-secondary);"></li>').text(strings().txtNoResults));
            }
            _results.forEach(function (entry, i) {
                var disabled = isDisabled(entry),
                    $li = $('<li role="option" style="display:flex;justify-content:space-between;gap:12px;padding:4px 8px;cursor:default;"></li>')
                        .attr({ id: 'cmd-search-item-' + i, 'data-index': i, 'aria-disabled': disabled });
                $li.append($('<span></span>').text(entry.name));
                $li.append($('<span style="color:var(--text-secondary);white-space:nowrap;"></span>')
                    .text(_.compact([entry.tabCaption, entry.path]).join(' \u203a ')));
                disabled && $li.css('opacity', 0.4).addClass('disabled');
                _list.append($li);
            });
            _input.attr('aria-expanded', _results.length > 0);
            select(_sel);
        }

        function select(i) {
            _sel = i;
            _list.children('[data-index]').each(function (j, li) {
                var on = (j === i);
                $(li).attr('aria-selected', on).css('background', on ? 'var(--highlight-button-hover)' : '');
                on && li.scrollIntoView && li.scrollIntoView({ block: 'nearest' });
            });
            if (i > -1) _input.attr('aria-activedescendant', 'cmd-search-item-' + i);
            else _input.removeAttr('aria-activedescendant');
        }

        function choose(i) {
            var entry = _results[i];
            if (!entry || isDisabled(entry)) return;
            hide(false);
            activate(toolbar(), entry);
            if ((!document.activeElement || document.activeElement === document.body) && !Common.Utils.ModalWindow.isVisible())
                Common.NotificationCenter.trigger('edit:complete');
        }

        function onKeyDown(e) {
            var n = _results.length;
            switch (e.keyCode) {
            case Common.UI.Keys.DOWN: n && select((_sel + 1) % n); break;
            case Common.UI.Keys.UP: n && select((_sel - 1 + n) % n); break;
            case Common.UI.Keys.RETURN: choose(_sel); break;
            case Common.UI.Keys.ESC: hide(true); break;
            case Common.UI.Keys.TAB: hide(true); break;
            default:
                // the text box keeps everything else: no editor or app shortcut reacts while it is open
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
        }

        function show() {
            var tb = toolbar();
            if (!tb || !tb.$el || !tb.$el.is(':visible')) return false;
            !_box && render();
            _prevFocus = document.activeElement;
            _index = buildIndex(tb);
            _input.val('');
            update();

            var $tabs = tb.$el.find('.tabs').first(),
                top = ($tabs.length ? $tabs.offset().top + $tabs.outerHeight() : tb.$el.offset().top) + 2;
            _box.css({ top: top, left: Math.max(8, (Common.Utils.innerWidth() - 360) / 2) }).show();
            api() && api().asc_enableKeyEvents(false);
            _input.focus();
            return true;
        }

        // restore: Esc / Tab - focus goes back where it was (the document if that was nowhere useful)
        function hide(restore) {
            if (!_box || !_box.is(':visible')) return;
            _box.hide();
            _list.empty();
            _results = [];
            _index = [];
            !Common.Utils.ModalWindow.isVisible() && api() && api().asc_enableKeyEvents(true);
            if (restore) {
                var prev = _prevFocus;
                if (prev && prev !== document.body && $.contains(document.documentElement, prev) && $(prev).is(':visible'))
                    prev.focus();
                else
                    Common.NotificationCenter.trigger('edit:complete');
            }
            _prevFocus = null;
        }

        function isEnabled() {
            return !!_prefix && Common.localStorage.getBool(_prefix + '-settings-command-search');
        }

        function onShortcut() {
            if (!isEnabled()) return true;      // the key does what it did before
            if (_box && _box.is(':visible')) {
                hide(true);
            } else if (!Common.Utils.ModalWindow.isVisible() && !$('#file-menu-panel').is(':visible')) {
                Common.UI.Menu.Manager && Common.UI.Menu.Manager.hideAll();
                show();
            }
            return false;
        }

        // owner: the editor's Toolbar controller (owner.toolbar - the ribbon view, owner.api)
        function attach(owner, prefix) {
            _owner = owner;
            _prefix = prefix;
            var keymap = {};
            keymap[shortcutKey()] = onShortcut;
            Common.util.Shortcuts.delegateShortcuts({shortcuts: keymap});
        }

        function shortcutKey() {
            return Common.Utils.isMac ? 'ctrl+alt+/' : 'alt+/';
        }

        function shortcutLabel() {
            return Common.Utils.isMac ? '\u2303\u2325/' : Common.Utils.String.textAlt + '+/';
        }

        return {
            attach: attach,
            buildIndex: buildIndex,
            search: search,
            activate: activate,
            show: show,
            hide: hide,
            isEnabled: isEnabled,
            onShortcut: onShortcut,
            shortcutKey: shortcutKey,
            shortcutLabel: shortcutLabel,

            txtTitle: 'Command search',
            txtPlaceholder: 'Search for a command',
            txtNoResults: 'No matching commands'
        };
    })(), Common.UI.CommandSearch || {});
});
