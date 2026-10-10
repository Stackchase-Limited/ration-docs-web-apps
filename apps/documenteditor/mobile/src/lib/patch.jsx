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
    const isImageOf = (object, kind) => {
        if (object.get_ObjectType() !== Type.Image) return false;
        const value = object.get_ObjectValue();
        if (!value) return false;
        if (kind === 'chart') return !!value.get_ChartProperties();
        if (kind === 'shape') return !!value.get_ShapeProperties();
        return !value.get_ShapeProperties() && !value.get_ChartProperties();
    };

    storeFocusObjects.intf = {
        // The edit panels to offer for the current selection (view/edit/EditingPage.jsx).
        filterFocusObjects: () => {
            const settings = [];
            for (let object of objects()) {
                const type = object.get_ObjectType();
                if (Type.Paragraph === type) {
                    settings.push('text', 'paragraph');
                } else if (Type.Table === type) {
                    settings.push('table');
                } else if (Type.Image === type) {
                    if (isImageOf(object, 'chart')) {
                        // a chart is drawn inside a shape: show the chart panel, not both
                        const si = settings.indexOf('shape');
                        si < 0 ? settings.push('chart') : settings.splice(si, 1, 'chart');
                    } else if (isImageOf(object, 'shape') && !settings.includes('chart')) {
                        settings.push('shape');
                    } else if (isImageOf(object, 'image')) {
                        settings.push('image');
                    }
                } else if (Type.Hyperlink === type) {
                    settings.push('hyperlink');
                } else if (Type.Header === type) {
                    settings.push('header');
                }
            }
            return settings.filter((value, index, self) => self.indexOf(value) === index);
        },
        getHeaderObject: () => topObjectValue(objects(), o => o.get_ObjectType() === Type.Header),
        getParagraphObject: () => topObjectValue(objects(), o => o.get_ObjectType() === Type.Paragraph),
        getShapeObject: () => topObjectValue(objects(), o => isImageOf(o, 'shape')),
        getImageObject: () => topObjectValue(objects(), o => isImageOf(o, 'image')),
        getTableObject: () => topObjectValue(objects(), o => o.get_ObjectType() === Type.Table),
        getChartObject: () => topObjectValue(objects(), o => isImageOf(o, 'chart')),
        getLinkObject: () => topObjectValue(objects(), o => o.get_ObjectType() === Type.Hyperlink),
    };

    getApi().asc_registerCallback('asc_onFocusObject', focusObjects => storeFocusObjects.resetFocusObjects(focusObjects));
};

EditorUIController.initEditorStyles = storeParagraphSettings => {
    const api = getApi();
    api.asc_setParagraphStylesSizes(330, 38);
    api.asc_registerCallback('asc_onInitEditorStyles', styles => storeParagraphSettings.initEditorStyles(styles));
    api.asc_registerCallback('asc_onParaStyleName', name => storeParagraphSettings.changeParaStyleName(name));
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
        const { canViewComments, canComments, canCoAuthoring, canReview, isDisconnected, isProtected, typeProtection, canEditComments, isViewer } = controller.props;

        const api = getApi();
        const stack = api.getSelectedElements();
        const canCopy = api.can_CopyCut();
        const inToc = api.asc_GetTableOfContentsPr(true);
        const isAllowedEditing = !isProtected || typeProtection === Asc.c_oAscEDocProtect.TrackedChanges;
        const isAllowedCommenting = typeProtection === Asc.c_oAscEDocProtect.Comments;

        let itemsIcon = [],
            itemsText = [];

        let isText = false, isTable = false, isImage = false, isChart = false, isShape = false, isLink = false,
            lockedText = false, lockedTable = false, lockedImage = false, lockedHeader = false;

        stack.forEach(item => {
            const objectType = item.get_ObjectType(),
                objectValue = item.get_ObjectValue();

            if (objectType == Asc.c_oAscTypeSelectElement.Header) {
                lockedHeader = objectValue.get_Locked();
            } else if (objectType == Asc.c_oAscTypeSelectElement.Paragraph) {
                lockedText = objectValue.get_Locked();
                isText = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Image) {
                lockedImage = objectValue.get_Locked();
                if (objectValue && objectValue.get_ChartProperties()) {
                    isChart = true;
                } else if (objectValue && objectValue.get_ShapeProperties()) {
                    isShape = true;
                } else {
                    isImage = true;
                }
            } else if (objectType == Asc.c_oAscTypeSelectElement.Table) {
                lockedTable = objectValue.get_Locked();
                isTable = true;
            } else if (objectType == Asc.c_oAscTypeSelectElement.Hyperlink) {
                isLink = true;
            }
        });

        const locked = lockedText || lockedTable || lockedImage || lockedHeader;

        if (canCopy) {
            itemsIcon.push({ event: 'copy', icon: IconCopy.id });
        }

        if (stack.length > 0 && !isDisconnected && isAllowedEditing) {
            if (!locked && canCopy) {
                itemsIcon.unshift({ event: 'cut', icon: IconCut.id });
            }
            if (!locked) {
                itemsIcon.push({ event: 'paste', icon: IconPaste.id });
            }
            if (isTable && api.CheckBeforeMergeCells() && !lockedTable && !lockedHeader) {
                itemsText.push({ caption: _t.menuMerge, event: 'merge' });
            }
            if (isTable && api.CheckBeforeSplitCells() && !lockedTable && !lockedHeader) {
                itemsText.push({ caption: _t.menuSplit, event: 'split' });
            }
            if (!locked) {
                itemsText.push({ caption: _t.menuDelete, event: 'delete' });
            }
            if (isTable && !lockedTable && !lockedText && !lockedHeader) {
                itemsText.push({ caption: _t.menuDeleteTable, event: 'deletetable' });
            }
            if (!locked) {
                itemsText.push({ caption: _t.menuEdit, event: 'edit' });
            }
            if (!isLink && !!api.can_AddHyperlink() && !lockedHeader) {
                itemsText.push({ caption: _t.menuAddLink, event: 'addlink' });
            }
            if (canReview) {
                itemsText.push(controller.inRevisionChange
                    ? { caption: _t.menuReviewChange, event: 'reviewchange' }
                    : { caption: _t.menuReview, event: 'review' });
            }
        }

        if (!isDisconnected) {
            if (controller.isComments && canViewComments) {
                itemsText.push({ caption: _t.menuViewComment, event: 'viewcomment' });
            }
            const isObject = isShape || isChart || isImage || isTable;
            if (api.can_AddQuotedComment() !== false && canCoAuthoring && canComments && !locked && !(!isText && isObject)
                && (!isViewer || canEditComments) && (isAllowedEditing || isAllowedCommenting)) {
                itemsText.push({ caption: _t.menuAddComment, event: 'addcomment' });
            }
        }

        if (isLink) {
            itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
            if (isAllowedEditing && !isDisconnected) {
                itemsText.push({ caption: _t.menuEditLink, event: 'editlink' });
            }
        }

        if (inToc && isAllowedEditing && !isDisconnected) {
            itemsText.push({ caption: _t.textRefreshEntireTable, event: 'refreshEntireTable' });
            itemsText.push({ caption: _t.textRefreshPageNumbersOnly, event: 'refreshPageNumbers' });
        }

        if (Device.phone && itemsText.length > 2) {
            controller.extraItems = itemsText.splice(2, itemsText.length, { caption: _t.menuMore, event: 'showActionSheet' });
        } else {
            controller.extraItems = [];
        }

        return itemsIcon.concat(itemsText);
    },

    // Returns true when the action was handled here; false lets controller/ContextMenu.jsx
    // run its own handling (copy, view comment, open link, review, table of contents).
    handleMenuItemClick: (controller, action) => {
        const api = getApi();
        switch (action) {
            case 'cut':
                if (!api.Cut() && !LocalStorage.getBool('de-hide-copy-cut-paste-warning'))
                    controller.showCopyCutPasteModal();
                return true;
            case 'paste':
                if (!api.Paste() && !LocalStorage.getBool('de-hide-copy-cut-paste-warning'))
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
