// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import './globals.css';

export default function RootLayout(props: React.PropsWithChildren) {
    return (
        <html data-theme="peter" lang="en">
            <head></head>
            <body>
                {props.children}
            </body>
        </html>
    );
}
