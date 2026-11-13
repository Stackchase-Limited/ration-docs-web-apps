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
 *  EquationSettings.js
 *
 *  Ration Docs #99: an "Equation" panel for the right sidebar, shown while the cursor is in an
 *  equation. It holds
 *    - the structures of the Insert > Equation gallery (fraction, script, radical, integral, large
 *      operator, bracket, ...), from the same EquationGroups collection the gallery and the floating
 *      equation toolbar use, inserted with api.asc_AddMath like they do;
 *    - a searchable symbol palette built from sdkjs's math symbol table (the \name list that math
 *      autocorrect uses, api.asc_getAutoCorrectMathSymbols), grouped into Greek, operators,
 *      relations, arrows, letter-like and other symbols; a symbol goes into the equation with
 *      api.asc_insertSymbol;
 *    - the Professional / Linear conversion of the current equation and the Unicode / LaTeX input.
 *  Opt-in: File > Advanced settings, <prefix>-settings-equation-panel, off by default.
 *
 *  The editor's right menu creates it with { el, prefix, getEquationGroups } and calls setApi,
 *  ChangeSettings (when the panel becomes active), setLocked and disableControls.
 */

define([
    'common/main/lib/component/Button',
    'common/main/lib/component/Menu',
    'common/main/lib/component/DataView',
    'common/main/lib/component/InputField',
    'common/main/lib/component/ComboBox',
    'common/main/lib/component/RadioBox'
], function () {
    'use strict';

    // Unicode ranges of each palette category; the first matching category wins, anything left is "other".
    var _categories = [
        ['greek',     [[0x0391, 0x03FF], [0x1D6A8, 0x1D7CB]]],
        ['arrows',    [[0x2190, 0x21FF], [0x27F0, 0x27FF], [0x2900, 0x297F], [0x2B04, 0x2B0D]]],
        ['relations', [[0x003C, 0x003E], [0x2208, 0x220D], [0x221D, 0x221D], [0x2223, 0x2226], [0x2236, 0x2237],
                       [0x223C, 0x228B], [0x228F, 0x2292], [0x22A2, 0x22A5], [0x22A8, 0x22AF], [0x22B2, 0x22B5],
                       [0x22D0, 0x22D1], [0x22D4, 0x22ED], [0x2A7D, 0x2ABA], [0x2AC5, 0x2AC6], [0x27C2, 0x27C2]]],
        ['operators', [[0x002A, 0x002F], [0x00AC, 0x00AC], [0x00B1, 0x00B1], [0x00B7, 0x00B7], [0x00D7, 0x00D7], [0x00F7, 0x00F7],
                       [0x2200, 0x22FF], [0x2A00, 0x2AFF], [0x2295, 0x22A1]]],
        ['letterlike',[[0x2100, 0x214F], [0x1D400, 0x1D7FF]]]
    ];

    var _isHidden = function(code) { // combining marks, spaces and invisible operators: nothing to click on
        return code < 0x21 || (code >= 0x0300 && code <= 0x036F) || (code >= 0x20D0 && code <= 0x20FF) ||
            (code >= 0x2000 && code <= 0x200F) || (code >= 0x2028 && code <= 0x202F) || (code >= 0x205F && code <= 0x2064) ||
            code === 0x00A0 || code === 0x3000;
    };

    var _category = function(code) {
        for (var i = 0; i < _categories.length; i++) {
            var ranges = _categories[i][1];
            for (var j = 0; j < ranges.length; j++)
                if (code >= ranges[j][0] && code <= ranges[j][1]) return _categories[i][0];
        }
        return 'other';
    };

    // [[name, code | [codes]], ...] -> [{code, ch, names, category}], one entry per character
    var _buildSymbols = function(list) {
        var byCode = {}, result = [];
        _.each(list || [], function(item) {
            var name = item && item[0], code = item && item[1];
            if (typeof code !== 'number' || typeof name !== 'string' || _isHidden(code)) return;
            var sym = byCode[code];
            if (!sym) {
                sym = byCode[code] = { code: code, ch: String.fromCodePoint(code), names: [], category: _category(code) };
                result.push(sym);
            }
            sym.names.push(name);
        });
        _.each(result, function(sym) { // a \command first: that is what people type
            sym.names.sort(function(a, b) { return (a.charAt(0) === '\\' ? 0 : 1) - (b.charAt(0) === '\\' ? 0 : 1); });
        });
        // by category (in the order of the category list), then by code
        var order = _.map(_categories, function(c) { return c[0]; }).concat(['other']);
        result.sort(function(a, b) { return (order.indexOf(a.category) - order.indexOf(b.category)) || (a.code - b.code); });
        return result;
    };

    // every word of the query must be found in a name (without the backslash) or be the character itself;
    // the name typed exactly (\alpha before \Alpha) comes first, then names starting with it, then the rest
    var _filter = function(symbols, category, query) {
        var raw = (query || '').replace(/\\/g, '').trim(),
            words = raw.toLowerCase().split(/\s+/).filter(function(w) { return w.length; }),
            ranked = [[], [], [], []];
        _.each(symbols, function(sym) {
            if (category && category !== 'all' && sym.category !== category) return;
            if (!words.length) { ranked[0].push(sym); return; }
            var names = sym.names.map(function(n) { return n.replace(/^\\/, ''); }),
                lower = names.map(function(n) { return n.toLowerCase(); }),
                ok = _.every(words, function(w) {
                    return w === sym.ch || _.some(lower, function(n) { return n.indexOf(w) >= 0; });
                });
            if (!ok) return;
            var rank = (raw === sym.ch || _.contains(names, raw)) ? 0 : _.contains(lower, raw.toLowerCase()) ? 1 :
                _.some(lower, function(n) { return n.indexOf(words[0]) === 0; }) ? 2 : 3;
            ranked[rank].push(sym);
        });
        return [].concat.apply([], ranked);
    };

    Common.Views.EquationSettings = Backbone.View.extend(_.extend({
        options: {
            alias: 'EquationSettings'
        },

        template: _.template([
            '<table cols="1" role="presentation" class="eq-settings" style="width: 100%;">',
                '<tr><td class="padding-large"><label style="font-size: 18px;"><%= scope.textTitle %></label></td></tr>',
                '<tr><td class="padding-small"><label class="header"><%= scope.textStructures %></label></td></tr>',
                '<tr><td class="padding-large"><div class="eq-structures" style="display: flex; flex-wrap: wrap; gap: 2px;"></div></td></tr>',
                '<tr><td class="padding-small"><label class="header"><%= scope.textSymbols %></label></td></tr>',
                '<tr><td class="padding-small"><div class="eq-symbol-search" style="width: 100%;"></div></td></tr>',
                '<tr><td class="padding-small"><div class="eq-symbol-category" style="width: 100%;"></div></td></tr>',
                '<tr><td class="padding-large">',
                    '<div class="eq-symbols" role="listbox" aria-label="<%= scope.textSymbols %>" style="display: flex; flex-wrap: wrap; max-height: 230px; overflow-y: auto;"></div>',
                    '<div class="eq-symbols-empty hidden" style="opacity: 0.6;"><%= scope.textNoSymbols %></div>',
                '</td></tr>',
                '<tr><td class="padding-small"><label class="header"><%= scope.textView %></label></td></tr>',
                '<tr><td class="padding-large"><div style="display: flex; gap: 4px;">',
                    '<div class="eq-btn-professional" style="flex: 1;"></div><div class="eq-btn-linear" style="flex: 1;"></div>',
                '</div></td></tr>',
                '<tr><td class="padding-small"><label class="header"><%= scope.textInput %></label></td></tr>',
                '<tr><td class="padding-small"><div class="eq-radio-unicode"></div></td></tr>',
                '<tr><td class="padding-large"><div class="eq-radio-latex"></div></td></tr>',
            '</table>'
        ].join('')),

        initialize: function (options) {
            this.prefix = options.prefix || 'de';
            this.getEquationGroups = options.getEquationGroups;
            this._locked = false;
            this._rendered = false;
            this.structureBtns = [];
            this.symbols = null;
            this.render();
        },

        render: function () {
            var me = this;
            me.$el.html(me.template({ scope: me }));

            me.inputSearch = new Common.UI.InputField({
                el: me.$el.find('.eq-symbol-search'),
                placeHolder: me.textSearch,
                style: 'width: 100%;',
                ariaLabel: me.textSearch,
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'small'
            });
            me.inputSearch._input.on('input', function() { me.fillSymbols(); });
            me.inputSearch._input.on('keydown', function(e) {
                if (e.keyCode === Common.UI.Keys.RETURN) { // Enter inserts the first match
                    var first = me.$el.find('.eq-symbols .eq-symbol').first();
                    first.length && me.insertSymbol(parseInt(first.attr('data-code')));
                }
            });

            me.cmbCategory = new Common.UI.ComboBox({
                el: me.$el.find('.eq-symbol-category'),
                cls: 'input-group-nr',
                menuStyle: 'min-width: 100%;',
                style: 'width: 100%;',
                editable: false,
                data: [
                    { value: 'all',        displayValue: me.textAll },
                    { value: 'greek',      displayValue: me.textGreek },
                    { value: 'operators',  displayValue: me.textOperators },
                    { value: 'relations',  displayValue: me.textRelations },
                    { value: 'arrows',     displayValue: me.textArrows },
                    { value: 'letterlike', displayValue: me.textLetterlike },
                    { value: 'other',      displayValue: me.textOther }
                ],
                ariaLabel: me.textCategory,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'big'
            });
            me.cmbCategory.setValue('all');
            me.cmbCategory.on('selected', function() { me.fillSymbols(); });

            me.$el.find('.eq-symbols').on('click', '.eq-symbol', function(e) {
                me.insertSymbol(parseInt($(e.currentTarget).attr('data-code')));
            });

            me.btnProfessional = new Common.UI.Button({
                parentEl: me.$el.find('.eq-btn-professional'),
                cls: 'btn-text-default',
                style: 'width: 100%;',
                caption: me.textProfessional,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'small'
            });
            me.btnLinear = new Common.UI.Button({
                parentEl: me.$el.find('.eq-btn-linear'),
                cls: 'btn-text-default',
                style: 'width: 100%;',
                caption: me.textLinear,
                dataHint: '1',
                dataHintDirection: 'bottom',
                dataHintOffset: 'small'
            });
            me.btnProfessional.on('click', function() { me.convertView(false); });
            me.btnLinear.on('click', function() { me.convertView(true); });

            me.radioUnicode = new Common.UI.RadioBox({
                el: me.$el.find('.eq-radio-unicode'),
                name: 'eq-settings-input',
                labelText: me.textUnicode,
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'small'
            });
            me.radioLatex = new Common.UI.RadioBox({
                el: me.$el.find('.eq-radio-latex'),
                name: 'eq-settings-input',
                labelText: me.textLatex,
                dataHint: '1',
                dataHintDirection: 'left',
                dataHintOffset: 'small'
            });
            me.radioUnicode.on('change', function(field, value) { value && me.setInputType(Asc.c_oAscMathInputType.Unicode); });
            me.radioLatex.on('change', function(field, value) { value && me.setInputType(Asc.c_oAscMathInputType.LaTeX); });

            me._rendered = true;
            return me;
        },

        setApi: function(api) {
            this.api = api;
            return this;
        },

        // the gallery's groups (EquationGroups) are filled from asc_onMathTypes; buttons are made once they exist
        createStructureButtons: function() {
            if (this.structureBtns.length) return;
            var me = this,
                store = me.getEquationGroups ? me.getEquationGroups() : null;
            if (!store || !store.length) return;

            var $box = me.$el.find('.eq-structures');
            store.each(function(group, i) {
                if (i === Common.define.c_oAscMathMainType.Symbol) return; // the palette below has the symbols
                var id = 'id-eq-settings-structure-' + i,
                    $slot = $('<span></span>').appendTo($box);
                var btn = new Common.UI.Button({
                    parentEl: $slot,
                    cls: 'btn-toolbar no-caret',
                    iconCls: 'svgicon ' + group.get('groupIcon'),
                    hint: group.get('groupName'),
                    value: i,
                    disabled: me._locked,
                    menu: new Common.UI.Menu({
                        menuAlign: 'tr-br',
                        items: [
                            { template: _.template('<div id="' + id + '" class="menu-shape margin-left-5" style="width:' + (group.get('groupWidth') + 8) + 'px; ' +
                                group.get('groupHeightStr') + '"></div>') }
                        ]
                    })
                });
                btn.menu.on('show:before', function onShowBefore(menu) {
                    var picker = new Common.UI.DataViewSimple({
                        el: $('#' + id, menu.cmpEl),
                        parentMenu: menu,
                        store: group.get('groupStore'),
                        scrollAlwaysVisible: true,
                        showLast: false,
                        restoreHeight: 450,
                        itemTemplate: _.template(
                            '<div class="item-equation" style="" >' +
                            '<div class="equation-icon" style="background-position:<%= posX %>px <%= posY %>px;width:<%= width %>px;height:<%= height %>px;" id="<%= id %>"></div>' +
                            '</div>')
                    });
                    picker.on('item:click', function(picker, item, record, e) {
                        record && me.insertStructure(record.get('data').equationType);
                        if (e.type !== 'click') menu.hide();
                    });
                    menu.off('show:before', onShowBefore);
                });
                me.structureBtns.push(btn);
            });
        },

        insertStructure: function(type) {
            if (this.api && !this._locked) {
                this.api.asc_AddMath(type);
                this.fireEvent('editcomplete', this);
            }
        },

        insertSymbol: function(code) {
            if (this.api && !this._locked && code > 0) {
                this.api.asc_insertSymbol('Cambria Math', code);
                this.fireEvent('editcomplete', this);
            }
        },

        convertView: function(toLinear) {
            if (this.api && !this._locked) {
                this.api.asc_ConvertMathView(toLinear, false);
                this.fireEvent('editcomplete', this);
            }
        },

        setInputType: function(type) {
            if (this.api && this.api.asc_GetMathInputType() !== type) {
                this.api.asc_SetMathInputType(type);
                Common.localStorage.setBool(this.prefix + '-equation-input-latex', type === Asc.c_oAscMathInputType.LaTeX);
            }
        },

        getSymbols: function() {
            if (!this.symbols && this.api && this.api.asc_getAutoCorrectMathSymbols)
                this.symbols = _buildSymbols(this.api.asc_getAutoCorrectMathSymbols());
            return this.symbols || [];
        },

        fillSymbols: function() {
            var list = _filter(this.getSymbols(), this.cmbCategory.getValue(), this.inputSearch._input.val()),
                html = _.map(list, function(sym) {
                    var tip = Common.Utils.String.htmlEncode(sym.names.join('  '));
                    return '<div class="eq-symbol" role="option" data-code="' + sym.code + '" title="' + tip + '" ' +
                        'style="width: 24px; height: 24px; line-height: 24px; text-align: center; cursor: pointer; font-size: 15px; ' +
                        'font-family: \'Cambria Math\', \'STIX Two Math\', \'Latin Modern Math\', serif;">' + Common.Utils.String.htmlEncode(sym.ch) + '</div>';
                }).join('');
            this.$el.find('.eq-symbols').html(html).toggleClass('disabled', this._locked);
            this.$el.find('.eq-symbols-empty').toggleClass('hidden', list.length > 0);
        },

        ChangeSettings: function(props) {
            this.createStructureButtons();
            this.symbols || this.fillSymbols();
            if (this.api) {
                var latex = this.api.asc_GetMathInputType() === Asc.c_oAscMathInputType.LaTeX;
                this.radioLatex.setValue(latex, true);
                this.radioUnicode.setValue(!latex, true);
            }
            this.disableControls(this._locked);
        },

        setLocked: function (locked) {
            this._locked = locked;
        },

        disableControls: function(disable) {
            _.each(this.structureBtns, function(btn) { btn.setDisabled(disable); });
            this.btnProfessional.setDisabled(disable);
            this.btnLinear.setDisabled(disable);
            this.radioUnicode.setDisabled(disable);
            this.radioLatex.setDisabled(disable);
            this.$el.find('.eq-symbols').toggleClass('disabled', !!disable).css('pointer-events', disable ? 'none' : '');
        },

        textTitle: 'Equation',
        textStructures: 'Structures',
        textSymbols: 'Symbols',
        textSearch: 'Search symbols (e.g. alpha, arrow)',
        textCategory: 'Symbol category',
        textAll: 'All symbols',
        textGreek: 'Greek letters',
        textOperators: 'Operators',
        textRelations: 'Relations',
        textArrows: 'Arrows',
        textLetterlike: 'Letter-like symbols',
        textOther: 'Other symbols',
        textNoSymbols: 'No matching symbols',
        textView: 'Equation view',
        textProfessional: 'Professional',
        textLinear: 'Linear',
        textInput: 'Linear input',
        textUnicode: 'Unicode',
        textLatex: 'LaTeX'
    }, Common.Views.EquationSettings || {}));

    Common.Views.EquationSettings.buildSymbols = _buildSymbols;
    Common.Views.EquationSettings.filterSymbols = _filter;
});
