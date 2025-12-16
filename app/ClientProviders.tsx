// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

'use client';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const kTheme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'class'
    },
    colorSchemes: {
        light: {
            palette: {
                divider: '#ac5900',
                primary: {
                    main: '#df8200',
                },
            },
        },
        dark: {
            palette: {
                divider: '#643600',
                primary: {
                    main: '#ff9f0a',
                }
            },
        },
    },
});

export function ClientProviders(props: React.PropsWithChildren) {
    return (
        <ThemeProvider theme={kTheme}>
            <CssBaseline />
            <Box sx={[
                theme => ({
                    backgroundColor: '#fafafa',
                    background: 'url(/images/bg-light.png)',
                }),
                theme => theme.applyStyles('dark', {
                    backgroundColor: '#121212',
                    background: 'url(/images/bg-dark.png)',
                }),
            ]}>
                {props.children}
            </Box>
        </ThemeProvider>
    );
}
