// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import { ClientProviders } from './ClientProviders';

export default function RootLayout(props: React.PropsWithChildren) {
    return (
        <html lang="en" suppressHydrationWarning>
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
