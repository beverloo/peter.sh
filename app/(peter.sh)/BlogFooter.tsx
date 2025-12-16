// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Link from '@app/ClientLink';

import { default as MuiLink } from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function BlogFooter() {
    return (
        <Stack component="footer" direction="column" alignItems="center" spacing={2}>
            <Divider flexItem />
            <Typography variant="body2">
                Copyright 2008–{new Date().getFullYear()} by{' '}
                <MuiLink component={Link} href="https://peter.sh/about">
                    Peter Beverloo
                </MuiLink>—source on{' '}
                <MuiLink component={Link} href="https://github.com/beverloo/peter.sh">
                    GitHub
                </MuiLink>
            </Typography>
        </Stack>
    );
}
