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

/*
 * Ration Docs: mobile editing in the open-source build.
 *
 * Upstream ships this file as a stub (isSupportEditFeature() === false, every
 * other hook a no-op) and swaps in a private, unpublished implementation at
 * build time - see the NormalModuleReplacementPlugin for /lib/patch/ in
 * vendor/framework7-react/build/webpack.config.js, which looks for
 * ../../../web-apps-mobile/<editor>/patch.jsx. With the stub, setPermissionOptions()
 * can never grant edit rights and Main.jsx shows "errorOpensource" (view only,
 * "a commercial license is required"), so the mobile editor is a viewer.
 *
 * Every editing panel, controller and store this needs is already public in
 * this tree; what was withheld is only the glue below: the toolbar edit/add
 * and undo/redo buttons, the edit-mode context menu, the sdk callbacks that
 * feed the stores, and the add/edit comment controllers. This is our own
 * implementation of that glue against the public interfaces.
 */

import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import { LocalStorage } from '../../../../common/mobile/utils/LocalStorage.mjs';
import { AddCommentController, EditCommentController } from '../../../../common/mobile/lib/controller/collaboration/Comments';
import SvgIcon from '@common/lib/component/SvgIcon';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';
import IconEditSettingsIos from '@common-ios-icons/icon-edit-settings.svg?ios';
import IconEditSettingsAndroid from '@common-android-icons/icon-edit-settings.svg';
import IconPlusIos from '@common-ios-icons/icon-plus.svg?ios';
import IconPlusAndroid from '@common-android-icons/icon-plus.svg';
// The context menu draws item icons from the svg sprite by symbol id, so the
// cut/copy/paste glyphs must be imported for them to exist in the bundle at all.
import IconCut from '@common-icons/icon-cut.svg';
import IconCopy from '@common-icons/icon-copy.svg';
import IconPaste from '@common-icons/icon-paste.svg';

const getApi = () => Common.EditorApi.get();

// The value of the top-most (last) object of the given selection type, or undefined.
const topObjectValue = (objects, accept) => {
    let found;
    for (let object of objects) {
        if (accept(object)) found = object;
    }
    return found ? found.get_ObjectValue() : undefined;
};

const EditorUIController = () => null;

EditorUIController.isSupportEditFeature = () => true;

EditorUIController.getUndoRedo = ({disabledUndo, disabledRedo, onUndoClick, onRedoClick}) => (
    <Fragment>
        <Link key='btn-undo' id='btn-undo' iconOnly className={disabledUndo ? 'disabled' : ''} href={false} onClick={onUndoClick}>
            <SvgIcon slot="media" symbolId={Device.ios ? IconUndoIos.id : IconUndoAndroid.id} className={'icon icon-svg'} />
        </Link>
        <Link key='btn-redo' id='btn-redo' iconOnly className={disabledRedo ? 'disabled' : ''} href={false} onClick={onRedoClick}>
            <SvgIcon slot="media" symbolId={Device.ios ? IconRedoIos.id : IconRedoAndroid.id} className={'icon icon-svg'} />
        </Link>
    </Fragment>
);

EditorUIController.getToolbarOptions = ({disabledEdit, disabledAdd, onEditClick, onAddClick}) => (
    <Fragment>
        <Link key='btn-edit' id='btn-edit' iconOnly className={disabledEdit ? 'disabled' : ''} href={false} onClick={onEditClick}>
            <SvgIcon slot="media" symbolId={Device.ios ? IconEditSettingsIos.id : IconEditSettingsAndroid.id} className={'icon icon-svg'} />
        </Link>
        <Link key='btn-add' id='btn-add' iconOnly className={disabledAdd ? 'disabled' : ''} href={false} onClick={onAddClick}>
            <SvgIcon slot="media" symbolId={Device.ios ? IconPlusIos.id : IconPlusAndroid.id} className={'icon icon-svg'} />
        </Link>
    </Fragment>
);

EditorUIController.getEditCommentControllers = () => [
    <AddCommentController key='add-comment-controller' />,
    <EditCommentController key='edit-comment-controller' />
];

EditorUIController.initThemeColors = () => {
    getApi().asc_registerCallback('asc_onSendThemeColors', (colors, standart_colors) => {
        Common.Utils.ThemeColor.setColors(colors, standart_colors);
    });
};

EditorUIController.initFonts = storeTextSettings => {
    const api = getApi();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => storeTextSettings.initEditorFonts(fonts, select));
    api.asc_registerCallback('asc_onFontFamily', font => storeTextSettings.resetFontName(font));
    api.asc_registerCallback('asc_onFontSize', size => storeTextSettings.resetFontSize(size));
    api.asc_registerCallback('asc_onBold', isBold => storeTextSettings.resetIsBold(isBold));
    api.asc_registerCallback('asc_onItalic', isItalic => storeTextSettings.resetIsItalic(isItalic));
    api.asc_registerCallback('asc_onUnderline', isUnderline => storeTextSettings.resetIsUnderline(isUnderline));
    api.asc_registerCallback('asc_onStrikeout', isStrikeout => storeTextSettings.resetIsStrikeout(isStrikeout));
};

EditorUIController.initFocusObjects = storeFocusObjects => {
    const Type = Asc.c_oAscTypeSelectElement;
    const objects = () => storeFocusObjects._focusObjects;
    const ofType = type => o => o.get_ObjectType() === type;

    storeFocusObjects.intf = {
        // The edit panels to offer for the current selection (view/edit/EditingPage.jsx).
        filterFocusObjects: () => {
            const settings = [];
            let noText = true;
            for (let object of objects()) {
                const type = object.get_ObjectType(),
                    value = object.get_ObjectValue();
                const locked = value && typeof value.get_Locked === 'function' ? value.get_Locked() : false;
                if (Type.Paragraph == type) {
                    if (!locked) noText = false;
                } else if (Type.Table == type) {
                    if (!locked) {
                        settings.push('table');
                        noText = false;
                    }
                } else if (Type.Slide == type) {
                    if (!(value.get_LockLayout() || value.get_LockBackground() || value.get_LockTransition() || value.get_LockTiming()))
                        settings.push('slide');
                } else if (Type.Image == type) {
                    if (!locked) settings.push('image');
                } else if (Type.Chart == type) {
                    if (!locked) settings.push('chart');
                } else if (Type.Shape == type && !value.get_FromChart()) {
                    if (!locked) {
                        settings.push('shape');
                        noText = false;
                    }
                } else if (Type.Hyperlink == type) {
                    settings.push('hyperlink');
                }
            }
            if (!noText && settings.indexOf('image') < 0)
                settings.unshift('text');
            const result = settings.filter((value, index, self) => self.indexOf(value) === index);
            // a hyperlink in locked text cannot be edited
            if (result.indexOf('hyperlink') > -1 && result.indexOf('text') < 0)
                result.splice(result.indexOf('hyperlink'), 1);
            // a chart is drawn inside a shape: show the chart panel, not both
            if (result.indexOf('chart') > -1 && result.indexOf('shape') > -1)
                result.splice(result.indexOf('shape'), 1);
            return result;
        },
        getSlideObject: () => topObjectValue(objects(), ofType(Type.Slide)),
        getParagraphObject: () => topObjectValue(objects(), ofType(Type.Paragraph)),
        getShapeObject: () => topObjectValue(objects(), ofType(Type.Shape)),
        getImageObject: () => topObjectValue(objects(), o => o.get_ObjectType() == Type.Image && !!o.get_ObjectValue()),
        getTableObject: () => topObjectValue(objects(), ofType(Type.Table)),
        getChartObject: () => topObjectValue(objects(), ofType(Type.Chart)),
        getLinkObject: () => topObjectValue(objects(), ofType(Type.Hyperlink)),
    };

    getApi().asc_registerCallback('asc_onFocusObject', focusObjects => storeFocusObjects.resetFocusObjects(focusObjects));
};

// Slide themes and layouts for view/edit/EditSlide.jsx.
EditorUIController.initEditorStyles = storeSlideSettings => {
    const api = getApi();
    api.asc_registerCallback('asc_onInitEditorStyles', themes => storeSlideSettings.addArrayThemes(themes));
    api.asc_registerCallback('asc_onUpdateThemeIndex', themeId => storeSlideSettings.changeSlideThemeIndex(themeId));
    api.asc_registerCallback('asc_onUpdateLayout', layouts => storeSlideSettings.addArrayLayouts(layouts));
};

EditorUIController.initTableTemplates = storeTableSettings => {
    // The table style previews are generated on demand by controller/edit/EditTable.jsx;
    // a new template set only has to invalidate the cached list.
    getApi().asc_registerCallback('asc_onInitTableTemplates', () => storeTableSettings.initTableTemplates());
};

EditorUIController.updateChartStyles = (storeChartSettings, storeFocusObjects) => {
    getApi().asc_registerCallback('asc_onUpdateChartStyles', () => {
        const chart = storeFocusObjects.chartObject;
        if (chart && chart.get_ChartProperties()) {
            storeChartSettings.updateChartStyles(getApi().asc_getChartPreviews(chart.get_ChartProperties().getType()));
        }
    });
};

EditorUIController.ContextMenu = {
    // Edit-mode context menu. The view-mode menu is built in controller/ContextMenu.jsx.
    mapMenuItems: controller => {
        const { t } = controller.props;
        const _t = t('ContextMenu', { returnObjects: true });
        const { canViewComments, canComments, canCoAuthoring, isDisconnected, isVersionHistoryMode } = controller.props;

        const api = getApi();
        const stack = api.getSelectedElements();
        const canCopy = api.can_CopyCut();

        let itemsIcon = [],
            itemsText = [];

        let isText = false, isTable = false, isImage = false, isChart = false, isShape = false, isLink = false, isSlide = false;

        stack.forEach(item => {
            const objectType = item.get_ObjectType();
            if (objectType == Asc.c_oAscTypeSelectElement.Paragraph) isText = true;
            else if (objectType == Asc.c_oAscTypeSelectElement.Image) isImage = true;
            else if (objectType == Asc.c_oAscTypeSelectElement.Chart) isChart = true;
            else if (objectType == Asc.c_oAscTypeSelectElement.Shape) isShape = true;
            else if (objectType == Asc.c_oAscTypeSelectElement.Table) isTable = true;
            else if (objectType == Asc.c_oAscTypeSelectElement.Hyperlink) isLink = true;
            else if (objectType == Asc.c_oAscTypeSelectElement.Slide) isSlide = true;
        });

        const isObject = isText || isImage || isChart || isShape || isTable;

        if (canCopy && isObject) {
            itemsIcon.push({ event: 'copy', icon: IconCopy.id });
        }

        if (stack.length > 0 && !isDisconnected && !isVersionHistoryMode) {
            const topObject = stack[stack.length - 1],
                topValue = topObject.get_ObjectValue();
            let objectLocked = typeof topValue.get_Locked === 'function' ? topValue.get_Locked() : false;
            !objectLocked && (objectLocked = typeof topValue.get_LockDelete === 'function' ? topValue.get_LockDelete() : false);

            if (!objectLocked) {
                if (canCopy && isObject) {
                    itemsIcon.unshift({ event: 'cut', icon: IconCut.id });
                }
                itemsIcon.push({ event: 'paste', icon: IconPaste.id });

                if (isTable && api.CheckBeforeMergeCells()) {
                    itemsText.push({ caption: _t.menuMerge, event: 'merge' });
                }
                if (isTable && api.CheckBeforeSplitCells()) {
                    itemsText.push({ caption: _t.menuSplit, event: 'split' });
                }
                if (isObject) {
                    itemsText.push({ caption: _t.menuDelete, event: 'delete' });
                }
                if (isTable) {
                    itemsText.push({ caption: _t.menuDeleteTable, event: 'deletetable' });
                }
                itemsText.push({ caption: _t.menuEdit, event: 'edit' });

                if (!isLink && api.can_AddHyperlink() !== false) {
                    itemsText.push({ caption: _t.menuAddLink, event: 'addlink' });
                }
                if (isSlide && !isObject) {
                    itemsText.push({ caption: _t.menuDuplicate, event: 'duplicateslide' });
                }
            }

            if (controller.isComments && canViewComments) {
                itemsText.push({ caption: _t.menuViewComment, event: 'viewcomment' });
            }
            if (!isChart && api.can_AddQuotedComment() !== false && canCoAuthoring && canComments && !objectLocked) {
                itemsText.push({ caption: _t.menuAddComment, event: 'addcomment' });
            }
        }

        if (isLink) {
            itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
            if (!isDisconnected && !isVersionHistoryMode) {
                itemsText.push({ caption: _t.menuEditLink, event: 'editlink' });
            }
        }

        if (Device.phone && itemsText.length > 2) {
            controller.extraItems = itemsText.splice(2, itemsText.length, { caption: _t.menuMore, event: 'showActionSheet' });
        } else {
            controller.extraItems = [];
        }

        return itemsIcon.concat(itemsText);
    },

    // Returns true when the action was handled here; false lets controller/ContextMenu.jsx
    // run its own handling (copy, view comment, open link).
    handleMenuItemClick: (controller, action) => {
        const api = getApi();
        switch (action) {
            case 'cut':
                if (!api.Cut() && !LocalStorage.getBool('pe-hide-copy-cut-paste-warning'))
                    controller.showCopyCutPasteModal();
                return true;
            case 'paste':
                if (!api.Paste() && !LocalStorage.getBool('pe-hide-copy-cut-paste-warning'))
                    controller.showCopyCutPasteModal();
                return true;
            case 'merge':
                api.MergeCells();
                return true;
            case 'split':
                controller.showSplitModal();
                return true;
            case 'delete':
                api.asc_Remove();
                return true;
            case 'deletetable':
                api.remTable();
                return true;
            case 'duplicateslide':
                api.DublicateSlide();
                return true;
            case 'edit':
                setTimeout(() => controller.props.openOptions('edit'), 0);
                return true;
            case 'addlink':
                setTimeout(() => controller.props.openOptions('add-link'), 400);
                return true;
            case 'editlink':
                setTimeout(() => controller.props.openOptions('edit-link'), 400);
                return true;
            case 'addcomment':
                Common.Notifications.trigger('addcomment');
                return true;
        }
        return false;
    },
};

export default EditorUIController;
