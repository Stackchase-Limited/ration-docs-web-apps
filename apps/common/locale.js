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
if (Common === undefined) {
    var Common = {};
}

Common.Locale = new(function() {
    "use strict";
    var l10n = null;
    var loadcallback,
        apply = false,
        defLang = '{{DEFAULT_LANG}}',
        currentLang = defLang,
        _4letterLangs = ['pt-pt', 'zh-tw', 'sr-cyrl'];
    
    if ( defLang[0] == '{' )
        currentLang = defLang = 'en';

    var _applyLocalization = function(callback) {
        _clearRtl();
        try {
            callback && (loadcallback = callback);
            if (l10n) {
                for (var prop in l10n) {
                    var p = prop.split('.');
                    if (p && p.length > 2) {

                        var obj = window;
                        for (var i = 0; i < p.length - 1; ++i) {
                            if (obj[p[i]] === undefined) {
                                obj[p[i]] = new Object();
                            }
                            obj = obj[p[i]];
                        }

                        if (obj) {
                            obj[p[p.length - 1]] = l10n[prop];
                        }
                    }
                }
                loadcallback && loadcallback();
            } else
                apply = true;
        }
        catch (e) {
        }
    };

    var _get = function(prop, scope) {
        var res = '';
        if (l10n && scope && scope.name) {
            res = l10n[scope.name + '.' + prop];

            if ( !res && scope.default )
                res = scope.default;
        }

        return res || (scope ? eval(scope.name).prototype[prop] : '');
    };

    var _getCurrentLanguage = function() {
        return currentLang;
    };

    var _getDefaultLanguage = function() {
        return defLang;
    };

    var _getLoadedLanguage = function() {
        return loadedLang;
    };

    var _getUrlParameterByName = function(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    /* #2199: tell the renderer which language the interface is in.
       Chinese is the case that makes this matter. The translation file is chosen by
       language alone - "zh-CN" is reduced to "zh" below, since there is no zh-cn.json -
       but which glyphs are drawn is decided by the region, and a great many Han
       characters are written differently in Simplified and Traditional. Without a lang
       attribute the renderer has nothing to go on and falls back to whatever fontconfig
       ranks first, which is how a Simplified interface ends up drawn in Traditional
       forms. The tag written here keeps the region even when the translation does not.
       This is also the standard signal for hyphenation and for a screen reader. */
    var _setDocumentLang = function (tag) {
        if (tag && document.documentElement)
            document.documentElement.setAttribute('lang', tag);
    };

    /* "zh-cn" -> "zh-CN", "sr-cyrl" -> "sr-Cyrl": a two-letter subtag is a region and is
       upper case, a four-letter one is a script and is title case. */
    var _canonicalTag = function (parts) {
        if (parts.length < 2 || !parts[1])
            return parts[0];
        var sub = parts[1];
        sub = (sub.length === 4) ? sub.charAt(0).toUpperCase() + sub.slice(1)
                                 : sub.toUpperCase();
        return parts[0] + '-' + sub;
    };

    var _requireLang = function (l) {
        typeof l != 'string' && (l = null);
        var lang = (l || _getUrlParameterByName('lang') || defLang).toLowerCase().split(/[\-_]/);
        _setDocumentLang(_canonicalTag(lang));
        lang = lang[0] + (lang.length>1 ? '-' + lang[1] : '');
        var idx4Letters = _4letterLangs.indexOf(lang); // try to load 4 letters language
        lang = (idx4Letters<0) ? lang.split(/[\-]/)[0] : _4letterLangs[idx4Letters];
        currentLang = lang;
        fetch('locale/' + lang + '.json')
            .then(function(response) {
                if (!response.ok) {
                    if (idx4Letters>=0) { // try to load 2-letters language
                        throw new Error('4letters error');
                    }
                    currentLang = defLang;
                    if (lang != defLang)
                        /* load default lang if fetch failed */
                        return fetch('locale/' + defLang + '.json');

                    throw new Error('server error');
                }
                return response.json();
            }).then(function(response) {
                if ( response.json ) {
                    if (!response.ok)
                        throw new Error('server error');

                    return response.json();
                } else {
                    l10n = response;
                    /* to break promises chain */
                    throw new Error('loaded');
                }
            }).then(function(json) {
                l10n = json || {};
                apply && _applyLocalization();
            }).catch(function(e) {
                if ( /4letters/.test(e) ) {
                    return setTimeout(function(){
                        _requireLang(lang.split(/[\-_]/)[0]);
                    }, 0);
                }

                if ( !/loaded/.test(e) && currentLang != defLang && defLang && defLang.length < 3 ) {
                    return setTimeout(function(){
                        _requireLang(defLang)
                    }, 0);
                }

                l10n = l10n || {};
                apply && _applyLocalization();
                if ( e.message == 'loaded' ) {
                } else {
                    currentLang = null;
                    console.log('fetch error: ' + e);
                }
            });
    };

    var _clearRtl = function() {
        if (!_isCurrentRtl() && document.body.classList.contains('rtl')) {
            document.body.removeAttribute('dir');
            document.body.classList.remove('rtl');
            document.body.classList.remove('rtl-font');
            document.body.setAttribute('applang', currentLang);
            window.isrtl = false;
        }
    };

    if ( !window.fetch ) {
        /* use fetch polifill if native method isn't supported */
        var polyfills = ['../vendor/fetch/fetch.umd'];
        if ( !window.Promise ) {
            require(['../vendor/es6-promise/es6-promise.auto.min'],
                function () {
                    require(polyfills, _requireLang);
                });
        } else require(polyfills, _requireLang);
    } else _requireLang();

    const _isCurrentRtl = function () {
        return currentLang && (/^(ar|he|ur)$/i.test(currentLang));
    };

    return {
        apply: _applyLocalization,
        get: _get,
        getCurrentLanguage: _getCurrentLanguage,
        isCurrentLanguageRtl: _isCurrentRtl,
        getDefaultLanguage: _getDefaultLanguage
    };
    
})();


