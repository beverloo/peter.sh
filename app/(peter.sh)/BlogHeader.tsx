// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function BlogHeader() {
    return (
        <Stack component="header" direction="column" alignItems="center" spacing={2}>
            <Typography variant="h4">
                Peter Beverloo
            </Typography>
            <Divider flexItem />
        </Stack>
    );
}
