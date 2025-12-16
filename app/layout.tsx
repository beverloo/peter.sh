// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import type { Metadata } from 'next';
import { Noto_Sans, Noto_Serif } from 'next/font/google';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';

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
        <html lang="en" className={`${kHeaderFont.variable} ${kTextFont.variable}`}>
            <head></head>
            <body>
                <AppRouterCacheProvider>
                    <ClientProviders>
                        {props.children}
                    </ClientProviders>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}

export const metadata: Metadata = {
    title: 'Peter Beverloo',
    robots: 'noindex',
};
