// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import { Noto_Sans, Noto_Serif } from 'next/font/google';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import { ClientProviders } from './ClientProviders';

const kHeaderFont = Noto_Serif({
    weight: [ '500' ],
    display: 'swap',
    subsets: [ 'latin' ],
    variable: '--font-header',
});

const kTextFont = Noto_Sans({
    weight: [ '300', '500' ],
    display: 'swap',
    subsets: [ 'latin' ],
    variable: '--font-text',
});

export default function RootLayout(props: React.PropsWithChildren) {
    return (
        <html lang="en" suppressHydrationWarning
              className={`${kHeaderFont.variable} ${kTextFont.variable}`}>
            <head></head>
            <body>
                <AppRouterCacheProvider>
                    <ClientProviders>
                        <InitColorSchemeScript attribute="class" />
                        {props.children}
                    </ClientProviders>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
