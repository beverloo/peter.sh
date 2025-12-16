// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

'use client';

import Link from '../ClientLink';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

const kMenuItems = [
    {
        url: '/',
        urlMatchMode: 'strict',
        label: 'Home',
        header: true,
    },
    {
        url: '/blog',
        urlMatchMode: 'prefix',
        label: 'Blog',
    },
    {
        url: '/examples',
        urlMatchMode: 'strict',
        label: 'Experiments',
    },
    {
        url: '/about',
        urlMatchMode: 'prefix',
        label: 'About',
        header: true,
    },
];

export function BlogHeaderClient() {
    const pathname = usePathname();
    const [ items, headerOpen ] = useMemo(() => {
        let headerOpen = false;
        const items: React.ReactNode[] = [];

        for (const { url, urlMatchMode, label, header } of kMenuItems) {
            let active: boolean = false;
            switch (urlMatchMode) {
                case 'prefix':
                    active = pathname.startsWith(url);
                    break;
                case 'strict':
                    active = pathname === url;
                    break;
                default:
                    throw new Error(`Invalid urlMatchMode: ${urlMatchMode}`);
            }

            if (active)
                headerOpen ||= !!header;

            items.push(
                <Button key={url} size="small" variant={ active ? 'contained' : 'outlined' }
                        component={Link} href={url} sx={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    marginTop: '-1px !important',
                }}>
                    {label}
                </Button>
            );
        }

        return [ items, headerOpen ];

    }, [ pathname ]);

    return (
        <>
            <Stack component="nav" direction="row" spacing={2} key="navigation" sx={{
                borderTop: '1px solid transparent',
                borderTopColor: 'divider',
            }}>
                {items}
            </Stack>
            <Box sx={{
                backgroundImage: 'url(/images/header.jpg)',
                backgroundPosition: '90% center',
                borderRadius: 1,
                width: '100%',
                height: {
                    xs: headerOpen ? '128px' : '48px',
                    sm: headerOpen ? '192px' : '80px',
                },
                transition: '0.25s ease-out height',
            }} />
        </>
    );


    return
}
