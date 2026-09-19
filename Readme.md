# Ration Docs - web-apps

The editor user interface: toolbars, menus, dialogs, panels and the plugin manager.

Part of **[Ration Docs Desktop](https://github.com/Stackchase-Limited/ration-docs-desktop)**, an offline office suite maintained by Stackchase Limited. This repository is a modified version of [ONLYOFFICE/web-apps](https://github.com/ONLYOFFICE/web-apps), originally developed by Ascensio System SIA, forked at release 9.4.0.

## What lives here

`apps/documenteditor`, `apps/spreadsheeteditor`, `apps/presentationeditor` and
`apps/pdfeditor`, each with a desktop and a mobile interface, plus the shared
components in `apps/common`. The editing logic itself is in `sdkjs`.

## Building

This repository is not built on its own. It is one submodule of the suite, and
`build_tools` drives the whole build:

    git clone --recursive https://github.com/Stackchase-Limited/ration-docs-desktop.git
    cd ration-docs-desktop/build_tools
    python3 configure.py --module desktop --platform linux_arm64 --qt-dir /usr
    python3 make.py

## Licence and attribution

Distributed under the **GNU Affero General Public License v3** together with the
additional terms supplied with the original program; both are in `LICENSE`.
Non-code elements - illustrations, icon sets, documentation - are **CC BY-SA 4.0**.

    Copyright (C) Ascensio System SIA, 2009-2026
    Copyright (C) Stackchase Limited, 2026

This is a modified version of ONLYOFFICE software. The original was developed by
Ascensio System SIA; modifications are by Stackchase Limited, 2026. **ONLYOFFICE is
a trademark of Ascensio System SIA**, used here only to identify the software this
is based on. Ration Docs is not produced by, endorsed by, or affiliated with
Ascensio System SIA, and no trademark rights are granted by the licence.

The corresponding source for a released binary is the superproject at the matching
tag, with this repository at the commit that tag records.
