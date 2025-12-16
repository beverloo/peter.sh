// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

'use client';

import Link from '../ClientLink';
import { usePathname } from 'next/navigation';

import Button from '@mui/material/Button';

const kMenuItems = [
    {
        url: '/',
        urlMatchMode: 'strict',
        label: 'Home',
    },
    {
        url: '/blog',
        urlMatchMode: 'prefix',
        label: 'Blog',
    },
    {
        url: '/about',
        urlMatchMode: 'prefix',
        label: 'About',
    },
    {
        url: '/examples',
        urlMatchMode: 'strict',
        label: 'Experiments',
    },
];

export function BlogHeaderClient() {
    const pathname = usePathname();

    return kMenuItems.map(({ url, urlMatchMode, label }, index) => {
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

        return (
            <Button key={url} size="small" variant={ active ? 'contained' : 'outlined' }
                    component={Link} href={url} sx={{
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                marginTop: '-1px !important',
            }}>
                {label}
            </Button>
        );
    });
}
