// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Link from '../ClientLink';

import GitHubIcon from '@mui/icons-material/GitHub';
import IconButton from '@mui/material/IconButton';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import XIcon from '@mui/icons-material/X';

import { BlogHeaderClient } from './BlogHeaderClient';

export function BlogHeader() {
    return (
        <Stack component="header" direction="column" alignItems="stretch" spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Typography variant="h4" noWrap>
                    Peter Beverloo
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton component={Link} href="https://github.com/beverloo">
                        <GitHubIcon />
                    </IconButton>
                    <IconButton component={Link} href="https://www.linkedin.com/in/pbeverloo/">
                        <LinkedInIcon />
                    </IconButton>
                    <IconButton component={Link} href="https://x.com/beverloo">
                        <XIcon />
                    </IconButton>
                </Stack>
            </Stack>
            <BlogHeaderClient />
        </Stack>
    );
}
