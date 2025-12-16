// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

'use client';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const kTheme = createTheme({
    palette: {
        mode: 'dark',

        divider: '#ff9f0a',
        primary: {
            main: '#ff9f0a',
        }
    },
    shape: {
        borderRadius: 12,
    },
    typography: {
        h1: { fontFamily: 'var(--font-header)' },
        h2: { fontFamily: 'var(--font-header)' },
        h3: { fontFamily: 'var(--font-header)' },
        h4: { fontFamily: 'var(--font-header)' },
        h5: { fontFamily: 'var(--font-header)' },
        h6: { fontFamily: 'var(--font-header)' },

        subtitle1: { fontFamily: 'var(--font-header)' },
        subtitle2: { fontFamily: 'var(--font-header)' },

        fontFamily: 'var(--font-text)',
    },
});

export function ClientProviders(props: React.PropsWithChildren) {
    return (
        <ThemeProvider theme={kTheme}>
            <CssBaseline />
            <Box sx={{
                    backgroundColor: '#121212',
                    background: 'url(/images/bg-dark.png)',
            }}>
                {props.children}
            </Box>
        </ThemeProvider>
    );
}
