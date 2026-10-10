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
 * Upstream ships this file as a stub (isSupportEditFeature() === false) and
 * swaps in a private, unpublished implementation at build time - see the
 * NormalModuleReplacementPlugin for /lib/patch/ in
 * vendor/framework7-react/build/webpack.config.js. With the stub,
 * setPermissionOptions() can never grant edit rights and Main.jsx shows
 * "errorOpensource" (view only, "a commercial license is required").
 *
 * Every editing panel, controller and store this needs is already public in
 * this tree; what was withheld is only the glue below: the toolbar edit/add
 * and undo/redo buttons, the edit-mode context menu and the sdk callbacks
 * that feed the stores. This is our own implementation of that glue against
 * the public interfaces.
 */

import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import { LocalStorage } from '../../../../common/mobile/utils/LocalStorage.mjs';
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
const SelType = () => Asc.c_oAscSelectionType;

const isObjectSelection = selType => [SelType().RangeImage, SelType().RangeShape, SelType().RangeChart,
    SelType().RangeChartText, SelType().RangeShapeText].includes(selType);

// The value of the top-most (last) selected drawing matching accept(), or undefined.
const topObjectValue = (objects, accept) => {
    let found;
    for (let object of objects) {
        if (accept(object)) found = object;
    }
    return found ? found.get_ObjectValue() : undefined;
};

const EditorUIController = () => null;

EditorUIController.isSupportEditFeature = () => true;

EditorUIController.toolbarOptions = {
    getUndoRedo: ({disabledUndo, disabledRedo, onUndoClick, onRedoClick}) => (
        <Fragment>
            <Link key='btn-undo' id='btn-undo' iconOnly className={disabledUndo ? 'disabled' : ''} href={false} onClick={onUndoClick}>
                <SvgIcon slot="media" symbolId={Device.ios ? IconUndoIos.id : IconUndoAndroid.id} className={'icon icon-svg'} />
            </Link>
            <Link key='btn-redo' id='btn-redo' iconOnly className={disabledRedo ? 'disabled' : ''} href={false} onClick={onRedoClick}>
                <SvgIcon slot="media" symbolId={Device.ios ? IconRedoIos.id : IconRedoAndroid.id} className={'icon icon-svg'} />
            </Link>
        </Fragment>
    ),
    getEditOptions: ({disabledEdit, disabledAdd, focusOn, isShapeLocked, onEditClick, onAddClick}) => (
        <Fragment>
            <Link key='btn-edit' id='btn-edit' iconOnly className={(disabledEdit || (focusOn === 'obj' && isShapeLocked)) ? 'disabled' : ''} href={false} onClick={onEditClick}>
                <SvgIcon slot="media" symbolId={Device.ios ? IconEditSettingsIos.id : IconEditSettingsAndroid.id} className={'icon icon-svg'} />
            </Link>
            <Link key='btn-add' id='btn-add' iconOnly className={disabledAdd ? 'disabled' : ''} href={false} onClick={onAddClick}>
                <SvgIcon slot="media" symbolId={Device.ios ? IconPlusIos.id : IconPlusAndroid.id} className={'icon icon-svg'} />
            </Link>
        </Fragment>
    ),
};

EditorUIController.initThemeColors = () => {
    getApi().asc_registerCallback('asc_onSendThemeColors', (colors, standart_colors) => {
        Common.Utils.ThemeColor.setColors(colors, standart_colors);
    });
};

// Feeds the focus/cell/text/chart stores from the current selection (cell range or drawing).
EditorUIController.initCellInfo = props => {
    const { storeFocusObjects, storeCellSettings, storeTextSettings, storeChartSettings } = props;
    const Type = Asc.c_oAscTypeSelectElement;
    const isImageOf = (object, kind) => {
        if (object.get_ObjectType() !== Type.Image) return false;
        const value = object.get_ObjectValue();
        if (!value) return false;
        if (kind === 'chart') return !!value.get_ChartProperties();
        if (kind === 'shape') return !!value.get_ShapeProperties();
        return !value.get_ShapeProperties() && !value.get_ChartProperties();
    };

    storeFocusObjects.intf = {
        // What the selected cell range or drawing offers to edit (view/edit/EditingPage.jsx).
        getSelections: () => {
            const selections = [];
            const cellInfo = storeFocusObjects._cellInfo;
            if (!cellInfo) return selections;

            let isChart = false, isImage = false, isShape = false, isTextShape = false, isTextChart = false;
            switch (cellInfo.asc_getSelectionType()) {
                case SelType().RangeImage:      isImage = true; break;
                case SelType().RangeShape:      isShape = true; break;
                case SelType().RangeChart:      isChart = true; break;
                case SelType().RangeChartText:  isTextChart = true; break;
                case SelType().RangeShapeText:  isTextShape = true; break;
            }

            if (isImage || isShape || isChart) {
                isImage = isShape = isChart = false;
                for (let object of getApi().asc_getGraphicObjectProps()) {
                    if (object.asc_getObjectType() == Type.Image) {
                        const value = object.asc_getObjectValue();
                        const shapeProps = value.asc_getShapeProperties();
                        if (shapeProps) {
                            shapeProps.asc_getFromChart() ? (isChart = true) : (isShape = true);
                        } else if (value.asc_getChartProperties()) {
                            isChart = true;
                        } else {
                            isImage = true;
                        }
                    }
                }
            }

            if (isChart || isTextChart) {
                selections.push('chart');
                isTextChart && selections.push('text');
            } else if ((isShape || isTextShape) && !isImage) {
                selections.push('shape');
                isTextShape && selections.push('text');
            } else if (isImage) {
                selections.push('image');
                isShape && selections.push('shape');
            } else {
                selections.push('cell');
                cellInfo.asc_getHyperlink() && selections.push('hyperlink');
            }
            return selections;
        },
        getShapeObject: () => topObjectValue(storeFocusObjects._focusObjects, o => isImageOf(o, 'shape')),
        getImageObject: () => topObjectValue(storeFocusObjects._focusObjects, o => isImageOf(o, 'image')),
        getChartObject: () => topObjectValue(storeFocusObjects._focusObjects, o => isImageOf(o, 'chart')),
        getParagraphObject: () => topObjectValue(storeFocusObjects._focusObjects, o => o.get_ObjectType() === Type.Paragraph),
    };

    getApi().asc_registerCallback('asc_onSelectionChanged', cellInfo => {
        const api = getApi();
        storeFocusObjects.resetCellInfo(cellInfo);
        storeFocusObjects.setIsLocked(cellInfo);
        storeCellSettings.initCellSettings(cellInfo);
        storeTextSettings.initTextSettings(cellInfo);

        const isObject = isObjectSelection(cellInfo.asc_getSelectionType());
        storeFocusObjects.resetFocusObjects(isObject ? api.asc_getGraphicObjectProps() : []);
        storeFocusObjects.changeFocus(isObject);

        const chart = storeFocusObjects.chartObject;
        if (chart && chart.get_ChartProperties()) {
            storeChartSettings.updateChartStyles(api.asc_getChartPreviews(chart.get_ChartProperties().getType()));
        }
    });
};

EditorUIController.initEditorStyles = storeCellSettings => {
    getApi().asc_registerCallback('asc_onInitEditorStyles', styles => storeCellSettings.initCellStyles(styles));
};

EditorUIController.initFonts = props => {
    const { storeCellSettings, storeTextSettings } = props;
    const api = getApi();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeCellSettings.initEditorFonts(fonts, select);
        storeTextSettings.initEditorFonts(fonts, select);
    });
    api.asc_registerCallback('asc_onEditorSelectionChanged', fontObj => {
        storeCellSettings.initFontInfo(fontObj);
        storeTextSettings.initFontInfo(fontObj);
    });
};

EditorUIController.ContextMenu = {
    // Edit-mode context menu. The view-mode menu is built in controller/ContextMenu.jsx.
    mapMenuItems: controller => {
        const { t } = controller.props;
        const _t = t('ContextMenu', { returnObjects: true });
        const { canViewComments, canCoAuthoring, canComments, isDisconnected, isVersionHistoryMode, wsProps, isResolvedComments } = controller.props;

        const api = getApi();
        const cellinfo = api.asc_getCellInfo();
        const seltype = cellinfo.asc_getSelectionType();
        const xfs = cellinfo.asc_getXfs();
        const comments = cellinfo.asc_getComments();
        const isSolvedComment = comments?.length && comments[0].asc_getSolved();

        const iscellmenu = seltype == SelType().RangeCells,
            isrowmenu = seltype == SelType().RangeRow,
            iscolmenu = seltype == SelType().RangeCol,
            isobjmenu = isObjectSelection(seltype);

        let iscelllocked = cellinfo.asc_getLocked();
        if (!iscelllocked && isobjmenu) {
            api.asc_getGraphicObjectProps().every(object => {
                if (object.asc_getObjectType() == Asc.c_oAscTypeSelectElement.Image) {
                    iscelllocked = object.asc_getObjectValue().asc_getLocked();
                }
                return !iscelllocked;
            });
        }

        const itemsIcon = [],
            itemsText = [];

        if (isDisconnected || isVersionHistoryMode || iscelllocked || api.isCellEdited) {
            itemsIcon.push({ event: 'copy', icon: IconCopy.id });
        } else {
            itemsIcon.push({ event: 'cut', icon: IconCut.id });
            itemsIcon.push({ event: 'copy', icon: IconCopy.id });
            itemsIcon.push({ event: 'paste', icon: IconPaste.id });
            itemsText.push({ caption: _t.menuDelete, event: 'del' });

            if (isobjmenu) {
                if (!(wsProps && wsProps.Objects)) {
                    itemsText.push({ caption: _t.menuEdit, event: 'edit' });
                }
            } else {
                if (iscolmenu || isrowmenu) {
                    itemsText.push({ caption: _t.menuHide, event: 'hide' });
                    itemsText.push({ caption: _t.menuShow, event: 'show' });
                } else if (iscellmenu) {
                    if (!(wsProps && wsProps.FormatCells)) {
                        itemsText.push({ caption: _t.menuCell, event: 'edit' });
                        if (cellinfo.asc_getMerge() == Asc.c_oAscMergeOptions.None) {
                            itemsText.push({ caption: _t.menuMerge, event: 'merge' });
                        }
                        if (cellinfo.asc_getMerge() == Asc.c_oAscMergeOptions.Merge) {
                            itemsText.push({ caption: _t.menuUnmerge, event: 'unmerge' });
                        }
                        itemsText.push(xfs.asc_getWrapText()
                            ? { caption: _t.menuUnwrap, event: 'unwrap' }
                            : { caption: _t.menuWrap, event: 'wrap' });
                    }

                    if (cellinfo.asc_getHyperlink() && !cellinfo.asc_getMultiselect()) {
                        itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
                        itemsText.push({ caption: _t.menuEditLink, event: 'editlink' });
                    } else if (!cellinfo.asc_getHyperlink() && !cellinfo.asc_getMultiselect() &&
                        !cellinfo.asc_getLockText() && !(wsProps && wsProps.InsertHyperlinks)) {
                        itemsText.push({ caption: _t.menuAddLink, event: 'addlink' });
                    }
                }

                itemsText.push({
                    caption: api.asc_getSheetViewSettings().asc_getIsFreezePane() ? _t.menuUnfreezePanes : _t.menuFreezePanes,
                    event: 'freezePanes'
                });
            }

            if (api.asc_canFillHandle()) {
                itemsText.push({ caption: _t.menuAutofill, event: 'autofillCells' });
            }
        }

        if (!isDisconnected && !isVersionHistoryMode) {
            if (canViewComments && comments && comments.length && ((!isSolvedComment && !isResolvedComments) || isResolvedComments)) {
                itemsText.push({ caption: _t.menuViewComment, event: 'viewcomment' });
            } else if (iscellmenu && !api.isCellEdited && canCoAuthoring && canComments && comments && comments.length < 1) {
                itemsText.push({ caption: _t.menuAddComment, event: 'addcomment' });
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
    // run its own handling (copy, view comment, open link, autofill).
    handleMenuItemClick: (controller, action) => {
        const api = getApi();
        const info = api.asc_getCellInfo();
        switch (action) {
            case 'cut':
                if (!api.asc_Cut() && !LocalStorage.getBool('sse-hide-copy-cut-paste-warning'))
                    controller.showCopyCutPasteModal();
                return true;
            case 'paste':
                if (!api.asc_Paste() && !LocalStorage.getBool('sse-hide-copy-cut-paste-warning'))
                    controller.showCopyCutPasteModal();
                return true;
            case 'del':
                api.asc_emptyCells(Asc.c_oAscCleanOptions.All);
                return true;
            case 'wrap':
                api.asc_setCellTextWrap(true);
                return true;
            case 'unwrap':
                api.asc_setCellTextWrap(false);
                return true;
            case 'edit':
                setTimeout(() => controller.props.openOptions('edit'), 0);
                return true;
            case 'merge':
                controller.onMergeCells();
                return true;
            case 'unmerge':
                api.asc_mergeCells(Asc.c_oAscMergeOptions.None);
                return true;
            case 'hide':
                api[info.asc_getSelectionType() == SelType().RangeRow ? 'asc_hideRows' : 'asc_hideColumns']();
                return true;
            case 'show':
                api[info.asc_getSelectionType() == SelType().RangeRow ? 'asc_showRows' : 'asc_showColumns']();
                return true;
            case 'addlink':
                setTimeout(() => controller.props.openOptions('add-link'), 400);
                return true;
            case 'editlink':
                setTimeout(() => controller.props.openOptions('edit-link'), 400);
                return true;
            case 'freezePanes':
                api.asc_freezePane();
                return true;
            case 'addcomment':
                Common.Notifications.trigger('addcomment');
                return true;
        }
        return false;
    },
};

export default EditorUIController;
