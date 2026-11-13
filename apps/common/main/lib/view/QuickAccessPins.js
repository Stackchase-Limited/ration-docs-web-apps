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
 *  QuickAccessPins.js
 *
 *  Ration Docs #420: pin a ribbon button to the quick access toolbar of the in-page header.
 *  Opt-in: File > Advanced settings, <prefix>-settings-quick-access-pins, off by default.
 *
 *  Right-click on a plain ribbon button (one with its own id and icon, no menu, not split) offers
 *  "Add to quick access toolbar". The pin is a header button with the same icon and hint; it follows
 *  the source button's disabled and pressed state, and a click on it clicks the source button.
 *  Pins are kept per editor as a list of button ids in <prefix>-quick-access-pins (at most 10);
 *  right-click on a pin or the Customize Quick Access menu removes it.
 *  Only the in-page header shows pins: the native title-bar buttons of Windows/Linux are unchanged.
 */

define([
    'common/main/lib/component/Button',
    'common/main/lib/component/Menu'
], function () {
    'use strict';

    Common.UI.QuickAccessPins = _.extend((function () {
        var _owner, _prefix,
            _pins = [],         // {id, src, btn, slot, onDisabled, onActive}
            _menu = null, _menuTarget = null,
            _qaMenu = null;

        var maxPins = 10;

        function strings() { return Common.UI.QuickAccessPins; }

        function plain(s) {
            if (_.isArray(s)) s = s[0];
            return (typeof s == 'string') ? s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
        }

        function isEnabled() {
            return !!_prefix && Common.localStorage.getBool(_prefix + '-settings-quick-access-pins');
        }

        function storageKey() { return _prefix + '-quick-access-pins'; }

        function loadIds() {
            var ids;
            try { ids = JSON.parse(Common.localStorage.getItem(storageKey()) || '[]'); } catch (e) {}
            return _.isArray(ids) ? _.uniq(_.filter(ids, _.isString)).slice(0, maxPins) : [];
        }

        function saveIds(ids) {
            Common.localStorage.setItem(storageKey(), JSON.stringify(ids));
        }

        function toolbar() { return _owner && _owner.toolbar; }

        function header() {
            var app = _owner && _owner.getApplication && _owner.getApplication(),
                vp = app && app.getController('Viewport');
            return vp && vp.getView('Common.Views.Header');
        }

        // where the pins go: before the Customize Quick Access button of the in-page title bar
        function anchor() {
            return $('#box-document-title #slot-btn-dt-quick-access');
        }

        // a plain ribbon button: rendered as a single <button> with its own id and an icon, no menu, not split
        function canPin(btn) {
            var tb = toolbar();
            return !!(btn && btn.rendered && btn.options.id && btn.options.iconCls && !btn.menu && !btn.split &&
                      btn.cmpEl && btn.cmpEl.is('button') && tb && tb.$el && $.contains(tb.$el[0], btn.cmpEl[0]));
        }

        function buttonFromTarget(target) {
            var tb = toolbar(),
                root = tb && tb.$el && tb.$el[0];
            for (var el = target; el && el !== root && el.nodeType === 1; el = el.parentNode) {
                var btn = $.hasData(el) ? $(el).data('ui-button') : null;
                if (btn && btn.cmpEl && btn.cmpEl[0] === el) return btn;
            }
            return null;
        }

        function sourceById(id) {
            var el = document.getElementById(id),
                btn = el ? $(el).data('ui-button') : null;
            return canPin(btn) ? btn : null;
        }

        function captionOf(btn) {
            return plain(btn.options.hint || btn.hint) || plain(btn.options.caption || btn.caption) || btn.options.id;
        }

        function findPin(id) {
            return _.find(_pins, function (p) { return p.id === id; });
        }

        function renderPin(id) {
            var src = sourceById(id),
                $anchor = anchor();
            if (!src || !$anchor.length || findPin(id)) return;

            var $slot = $('<div class="btn-slot qa-pin" data-pin-id="' + _.escape(id) + '"></div>');
            $anchor.before($slot);
            // as the header's own title buttons (Header.js createTitleButton)
            var qa = header() && header().btnQuickAccess;
            var btn = new Common.UI.Button({
                cls: 'btn-header',
                iconCls: src.options.iconCls + ' icon--inverse',
                disabled: src.isDisabled(),
                dataHint: '0',
                dataHintDirection: qa ? qa.options.dataHintDirection : 'left',
                dataHintOffset: qa ? qa.options.dataHintOffset : '10, 10'
            }).render($slot);
            var hint = plain(src.options.hint || src.hint);
            hint && btn.updateHint(hint);
            btn.cmpEl.attr('aria-label', captionOf(src));

            var pin = { id: id, src: src, btn: btn, slot: $slot };
            pin.onDisabled = function (b, disabled) { btn.setDisabled(disabled); };
            pin.onActive = function () {
                setTimeout(function () {
                    var on = !!(src.enableToggle ? src.pressed : src.cmpEl.hasClass('active'));
                    btn.cmpEl.toggleClass('active', on).attr('aria-pressed', on);
                }, 0);
            };
            // the source tells about disabling only when it is asked to ('disabled' signal, as Desktop.js does for title buttons)
            src.options.signals = _.union(src.options.signals || [], ['disabled']);
            src.on('disabled', pin.onDisabled);
            src.cmpEl.on('button.internal.active', pin.onActive);
            pin.onActive();

            // a click on the pin is a click on the source button
            btn.on('click', function () {
                if (src.isDisabled()) return;
                src.cmpEl.trigger(jQuery.Event('click', {which: 1}));
            });
            btn.cmpEl.on('contextmenu', function (e) {
                showMenu(e, src);
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            _pins.push(pin);
        }

        function removePin(id) {
            var pin = findPin(id);
            if (!pin) return;
            pin.src.off('disabled', pin.onDisabled);
            pin.src.cmpEl.off('button.internal.active', pin.onActive);
            var tip = pin.btn.btnEl && pin.btn.btnEl.data('bs.tooltip');
            tip && tip.hide();
            pin.slot.remove();
            _pins = _.without(_pins, pin);
        }

        // shows the pins stored for this editor when the setting is on, none when it is off
        function refresh() {
            var ids = isEnabled() ? loadIds() : [];
            _.each(_.pluck(_pins, 'id'), function (id) { ids.indexOf(id) < 0 && removePin(id); });
            _.each(ids, renderPin);
            // keep the stored order
            var $anchor = anchor();
            _.each(ids, function (id) { var p = findPin(id); p && $anchor.before(p.slot); });
            hookCustomizeMenu();
            var h = header();
            h && h.updateDocNamePosition && h.updateDocNamePosition();
        }

        function pin(btn) {
            var ids = loadIds();
            if (!canPin(btn) || ids.indexOf(btn.options.id) > -1 || ids.length >= maxPins) return false;
            ids.push(btn.options.id);
            saveIds(ids);
            refresh();
            return true;
        }

        function unpin(id) {
            var ids = loadIds();
            if (ids.indexOf(id) < 0) return false;
            saveIds(_.without(ids, id));
            refresh();
            return true;
        }

        function createMenu() {
            var s = strings();
            _menu = new Common.UI.Menu({
                cls: 'shifted-right',
                items: [
                    { caption: s.txtAdd, value: 'add' },
                    { caption: s.txtRemove, value: 'remove' }
                ]
            });
            _menu.on('item:click', function (menu, item) {
                var btn = _menuTarget;
                _menuTarget = null;
                if (!btn) return;
                if (item.value === 'add') pin(btn);
                else unpin(btn.options.id);
                Common.NotificationCenter.trigger('edit:complete');
            });
            _menu.on('hide:after', function () { _menuTarget = null; });
        }

        function showMenu(e, btn) {
            if (!_menu) createMenu();
            var ids = loadIds(),
                pinned = ids.indexOf(btn.options.id) > -1;
            _menu.items[0].setVisible(!pinned);
            _menu.items[0].setDisabled(ids.length >= maxPins);
            _menu.items[1].setVisible(pinned);
            _menuTarget = btn;

            Common.UI.Menu.Manager.hideAll();
            var $container = $('#menu-container-' + _menu.id);
            if (!_menu.rendered) {
                if ($container.length < 1) {
                    $container = $('<div id="menu-container-' + _menu.id + '" style="position: absolute; z-index: 10000;"><div class="dropdown-toggle" data-toggle="dropdown"></div></div>');
                    $(document.body).append($container);
                }
                _menu.render($container);
                _menu.cmpEl.attr({tabindex: '-1'});
            }
            var zoom = Common.Utils.zoom();
            $container.css({ left: e.clientX * zoom, top: e.clientY * zoom });
            _menu.show();
            _menu.alignPosition();
            _.delay(function () { _menu.cmpEl.focus(); }, 10);
        }

        function onToolbarContextMenu(e) {
            if (!isEnabled() || !anchor().length) return;
            var btn = buttonFromTarget(e.target);
            if (!canPin(btn)) return;
            showMenu(e, btn);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // the Customize Quick Access menu lists the pins (checked); unchecking one removes it
        function hookCustomizeMenu() {
            var h = header(),
                menu = h && h.btnQuickAccess && h.btnQuickAccess.menu;
            if (!menu || !(menu instanceof Common.UI.Menu) || menu === _qaMenu) return;
            _qaMenu = menu;
            menu.on('show:before', function () {
                for (var i = menu.items.length - 1; i >= 0; i--)
                    menu.items[i].options.qaPin && menu.removeItem(menu.items[i]);
                if (!isEnabled()) return;
                var shown = _.filter(loadIds(), function (id) { return !!findPin(id); });
                shown.length && menu.addItem({ caption: '--', qaPin: true });
                _.each(shown, function (id) {
                    menu.addItem({ caption: captionOf(findPin(id).src), value: 'pin:' + id, checkable: true, checked: true, qaPin: true, pinId: id });
                });
            });
            menu.on('item:click', function (m, item) {
                var id = item.options.pinId;
                id && (item.checked ? pin(sourceById(id)) : unpin(id));
            });
        }

        // owner: the editor's Toolbar controller (owner.toolbar - the ribbon view)
        function attach(owner, prefix) {
            _owner = owner;
            _prefix = prefix;
            var tb = toolbar();
            tb && tb.$el && tb.$el.on('contextmenu', onToolbarContextMenu);
            Common.NotificationCenter.on('quickaccess:pins', refresh);
            // after the header has finished its own app:ready work (Customize Quick Access menu)
            setTimeout(refresh, 0);
        }

        return {
            attach: attach,
            refresh: refresh,
            canPin: canPin,
            pin: pin,
            unpin: unpin,
            isEnabled: isEnabled,
            getPinned: function () { return _.map(_pins, function (p) { return { id: p.id, src: p.src, btn: p.btn }; }); },
            maxPins: maxPins,

            txtAdd: 'Add to quick access toolbar',
            txtRemove: 'Remove from quick access toolbar'
        };
    })(), Common.UI.QuickAccessPins || {});
});
