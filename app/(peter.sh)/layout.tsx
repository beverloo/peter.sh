// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';

import { BlogFooter } from './BlogFooter';
import { BlogHeader } from './BlogHeader';

/**
 * Layout for peter.sh, i.e. the main website. Will match the general style of tests.peter.sh, but
 * will also include a few more references to other (popular) pages on the website.
 */
export default function Layout(props: React.PropsWithChildren) {
    return (
        <>
            <Stack spacing={2} direction="column" alignItems="center" justifyContent="space-between"
                   sx={{
                       height: '100vh',
                       overflowX: 'hidden',
                       padding: 2,
                   }}>
                <Container disableGutters maxWidth="xl">
                    <BlogHeader />
                </Container>
                <Container disableGutters maxWidth="xl">
                    {props.children}
                </Container>
                <Container disableGutters maxWidth="xl">
                    <BlogFooter />
                </Container>
            </Stack>
        </>
    );
}
