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
/**
 *  UserDictionaryDialog.js
 *
 *  #630: the words added with "Add to dictionary" (desktop user dictionary), so that one added by
 *  mistake can be removed again.
 *
 */

define([], function () { 'use strict';

    Common.Views.UserDictionaryDialog = Common.UI.Window.extend(_.extend({

        initialize : function(options) {
            var _options = {};

            _.extend(_options, {
                title: this.textTitle,
                header: true,
                width: 330,
                cls: 'modal-dlg',
                buttons: ['close']
            }, options || {});

            this.template = [
                '<div class="box">',
                    '<div class="input-row"><label>' + this.textDescription + '</label></div>',
                    '<div id="id-dlg-user-dict-list" style="width:100%; height: 180px; margin-bottom: 8px;"></div>',
                    '<button type="button" class="btn btn-text-default auto" id="id-dlg-user-dict-delete" style="min-width: 86px;">' + this.textDelete + '</button>',
                '</div>'
            ].join('');

            this.api = options.api;
            _options.tpl = _.template(this.template)(_options);
            Common.UI.Window.prototype.initialize.call(this, _options);
        },

        render: function() {
            Common.UI.Window.prototype.render.call(this);

            var $window = this.getChild();
            this.wordsList = new Common.UI.ListView({
                el: $window.find('#id-dlg-user-dict-list'),
                store: new Common.UI.DataViewStore([]),
                simpleAddMode: true,
                emptyText: this.textEmpty,
                itemTemplate: _.template('<div id="<%= id %>" class="list-item" style="width: 100%;overflow: hidden;text-overflow: ellipsis;"><%= Common.Utils.String.htmlEncode(value) %></div>'),
                tabindex: 1
            });
            this.wordsList.on('item:select', _.bind(this.updateButtons, this));

            this.btnDelete = new Common.UI.Button({
                el: $window.find('#id-dlg-user-dict-delete')
            });
            this.btnDelete.on('click', _.bind(this.onDelete, this));
            var me = this;
            $window.find('.dlg-btn').on('click', function() { me.close(); });

            this._onWords = _.bind(this.onWords, this);
            if (this.api) {
                this.api.asc_registerCallback('asc_onSpellCheckUserDictionary', this._onWords);
                this.api.asc_spellCheckGetUserDictionary && this.api.asc_spellCheckGetUserDictionary();
            }
            this.updateButtons();
        },

        onWords: function(words) {
            var arr = _.map(_.uniq(words || []), function(word) { return {value: word}; });
            arr.sort(function(a, b) { return a.value.localeCompare(b.value); });
            this.wordsList.store.reset(arr);
            this.updateButtons();
        },

        onDelete: function() {
            var rec = this.wordsList.getSelectedRec();
            if (!rec || !this.api) return;

            var index = this.wordsList.store.indexOf(rec);
            this.api.asc_spellCheckRemoveFromDictionary(rec.get('value'));
            this.wordsList.store.remove(rec);
            var count = this.wordsList.store.length;
            count && this.wordsList.selectByIndex(Math.min(index, count - 1));
            this.updateButtons();
        },

        updateButtons: function() {
            this.btnDelete.setDisabled(!this.wordsList.getSelectedRec());
        },

        getFocusedComponents: function() {
            return [this.wordsList, this.btnDelete].concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            return this.wordsList;
        },

        close: function() {
            this.api && this.api.asc_unregisterCallback('asc_onSpellCheckUserDictionary', this._onWords);
            Common.UI.Window.prototype.close.apply(this, arguments);
        },

        textTitle: 'Dictionary',
        textDescription: 'Words added to the dictionary',
        textDelete: 'Remove',
        textEmpty: 'No words'

    }, Common.Views.UserDictionaryDialog || {}));
});
