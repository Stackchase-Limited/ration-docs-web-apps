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
 *  FormatErrorBarsDialog.js
 *
 *  Custom error bars from sheet ranges (Ration Docs #278): direction, end style
 *  and the ranges holding the positive and negative error values.
 *
 */


if (Common === undefined)
    var Common = {};

define([], function () { 'use strict';

    SSE.Views.FormatErrorBarsDialog = Common.UI.Window.extend(_.extend({
        options: {
            width   : 350,
            cls     : 'modal-dlg',
            buttons: ['ok', 'cancel']
        },

        initialize : function(options) {
            _.extend(this.options, {
                title: this.txtTitle
            }, options);

            this.template = [
                '<div class="box">',
                '<table cols="2" style="width: 100%;">',
                '<tr><td colspan="2" style="padding-bottom: 4px;"><label class="header">' + this.txtDirection + '</label></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 4px;"><div id="id-dlg-errbars-both"></div></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 4px;"><div id="id-dlg-errbars-minus"></div></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 10px;"><div id="id-dlg-errbars-plus"></div></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 4px;"><label class="header">' + this.txtEndStyle + '</label></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 4px;"><div id="id-dlg-errbars-cap"></div></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 10px;"><div id="id-dlg-errbars-nocap"></div></td></tr>',
                '<tr><td colspan="2"><label>' + this.txtPositive + '</label></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 8px;width: 100%;"><div id="id-dlg-errbars-range-plus"></div></td></tr>',
                '<tr><td colspan="2"><label>' + this.txtNegative + '</label></td></tr>',
                '<tr><td colspan="2" style="padding-bottom: 8px;width: 100%;"><div id="id-dlg-errbars-range-minus"></div></td></tr>',
                '</table>',
                '</div>'
            ].join('');

            this.options.tpl = _.template(this.template)(this.options);

            Common.UI.Window.prototype.initialize.call(this, this.options);
        },

        render: function() {
            Common.UI.Window.prototype.render.call(this);

            var $window = this.getChild(),
                me = this;

            this.radioBoth = new Common.UI.RadioBox({
                el: $window.find('#id-dlg-errbars-both'),
                labelText: this.txtBoth,
                name: 'asc-radio-errbars-dir',
                checked: true
            }).on('change', _.bind(this.updateInputs, this));
            this.radioMinus = new Common.UI.RadioBox({
                el: $window.find('#id-dlg-errbars-minus'),
                labelText: this.txtMinus,
                name: 'asc-radio-errbars-dir'
            }).on('change', _.bind(this.updateInputs, this));
            this.radioPlus = new Common.UI.RadioBox({
                el: $window.find('#id-dlg-errbars-plus'),
                labelText: this.txtPlus,
                name: 'asc-radio-errbars-dir'
            }).on('change', _.bind(this.updateInputs, this));

            this.radioCap = new Common.UI.RadioBox({
                el: $window.find('#id-dlg-errbars-cap'),
                labelText: this.txtCap,
                name: 'asc-radio-errbars-cap',
                checked: true
            });
            this.radioNoCap = new Common.UI.RadioBox({
                el: $window.find('#id-dlg-errbars-nocap'),
                labelText: this.txtNoCap,
                name: 'asc-radio-errbars-cap'
            });

            this.inputPlus = new Common.UI.InputFieldBtn({
                el: $window.find('#id-dlg-errbars-range-plus'),
                style: '100%',
                btnHint: this.textSelectData,
                validateOnBlur: false
            }).on('button:click', _.bind(this.onSelectData, this));
            this.inputMinus = new Common.UI.InputFieldBtn({
                el: $window.find('#id-dlg-errbars-range-minus'),
                style: '100%',
                btnHint: this.textSelectData,
                validateOnBlur: false
            }).on('button:click', _.bind(this.onSelectData, this));

            $window.find('.dlg-btn').on('click', _.bind(this.onBtnClick, this));
        },

        getFocusedComponents: function() {
            return [this.radioBoth, this.radioMinus, this.radioPlus, this.radioCap, this.radioNoCap,
                    this.inputPlus, this.inputMinus].concat(this.getFooterButtons());
        },

        getDefaultFocusableComponent: function () {
            if (this._alreadyRendered) return; // focus only at first show
            this._alreadyRendered = true;
            return this.inputPlus;
        },

        onPrimary: function() {
            this._handleInput('ok');
            return false;
        },

        // settings: {api, chartSettings}; the dialog starts from the chart's current custom bars, if any
        setSettings: function(settings) {
            this.api = settings.api;
            this.chartSettings = settings.chartSettings;
            var info = this.chartSettings && this.chartSettings.getCustomErrorBars ? this.chartSettings.getCustomErrorBars() : null;
            if (info && info.errValType === AscFormat.st_errvaltypeCUST) {
                this.inputPlus.setValue(info.plus || '');
                this.inputMinus.setValue(info.minus || '');
            }
            if (info) {
                if (info.barType === AscFormat.st_errbartypeMINUS)
                    this.radioMinus.setValue(true, true);
                else if (info.barType === AscFormat.st_errbartypePLUS)
                    this.radioPlus.setValue(true, true);
                else
                    this.radioBoth.setValue(true, true);
                (info.endCap ? this.radioCap : this.radioNoCap).setValue(true, true);
            }
            this.updateInputs();
        },

        getBarType: function() {
            return this.radioMinus.getValue() ? AscFormat.st_errbartypeMINUS :
                   this.radioPlus.getValue() ? AscFormat.st_errbartypePLUS : AscFormat.st_errbartypeBOTH;
        },

        updateInputs: function() {
            var type = this.getBarType();
            this.inputPlus.setDisabled(type === AscFormat.st_errbartypeMINUS);
            this.inputMinus.setDisabled(type === AscFormat.st_errbartypePLUS);
        },

        // {plus, minus, barType, endCap}: a side the direction does not draw is left out
        getSettings: function() {
            var type = this.getBarType();
            return {
                plus: type === AscFormat.st_errbartypeMINUS ? '' : this.inputPlus.getValue(),
                minus: type === AscFormat.st_errbartypePLUS ? '' : this.inputMinus.getValue(),
                barType: type,
                endCap: this.radioCap.getValue()
            };
        },

        onSelectData: function(input) {
            var me = this;
            if (me.api) {
                var handlerDlg = function(dlg, result) {
                    if (result == 'ok') {
                        input.setValue(dlg.getSettings());
                    }
                };

                var win = new SSE.Views.CellRangeDialog({
                    allowBlank: true,
                    handler: handlerDlg
                }).on('close', function() {
                    me.show();
                    _.delay(function(){
                        input.focus();
                    },1);
                });

                var xy = Common.Utils.getOffset(me.$window);
                me.hide();
                win.show(me.$window, xy);
                win.setSettings({
                    api     : me.api,
                    range   : !_.isEmpty(input.getValue()) ? input.getValue() : '',
                    type    : Asc.c_oAscSelectionDialogType.Chart,
                    validation: function() {return true;}
                });
            }
        },

        isValid: function() {
            var settings = this.getSettings(),
                res = this.chartSettings.isValidCustomErrorBars(settings.plus, settings.minus);
            if (res === Asc.c_oAscError.ID.No)
                return true;
            var error = this.textInvalidRange;
            switch (res) {
                case Asc.c_oAscError.ID.NoValues:
                    error = this.errorNoValues;
                    break;
                case Asc.c_oAscError.ID.NoSingleRowCol:
                    error = this.errorNoSingleRowCol;
                    break;
                case Asc.c_oAscError.ID.ErrorInFormula:
                    error = this.errorInFormula;
                    break;
            }
            Common.UI.warning({msg: error, maxwidth: 600});
            return false;
        },

        onBtnClick: function(event) {
            this._handleInput(event.currentTarget.attributes['result'].value);
        },

        _handleInput: function(state) {
            if (state == 'ok' && !this.isValid()) return;
            if (this.options.handler) {
                if (this.options.handler.call(this, this, state))
                    return;
            }
            this.close();
        },

        txtTitle: 'Format Error Bars',
        txtDirection: 'Direction',
        txtBoth: 'Both',
        txtMinus: 'Minus',
        txtPlus: 'Plus',
        txtEndStyle: 'End style',
        txtCap: 'Cap',
        txtNoCap: 'No cap',
        txtPositive: 'Positive error value',
        txtNegative: 'Negative error value',
        textSelectData: 'Select data',
        textInvalidRange: 'Invalid cells range',
        errorInFormula: "There's an error in formula you entered.",
        errorNoSingleRowCol: 'The reference is not valid. References for error values must be a single cell, row, or column.',
        errorNoValues: 'Enter a range or values for at least one of the error values.'

    }, SSE.Views.FormatErrorBarsDialog || {}))
});
