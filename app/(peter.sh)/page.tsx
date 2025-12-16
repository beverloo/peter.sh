// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Link from '../ClientLink';
import { headers } from 'next/headers';

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import TestsIndexPage from '../(tests)/TestsIndexPage';

export default async function RootPage() {
    const requestOrigin =
        /* dev environment= */   process.env.APP_HOST_OVERRIDE ??
        /* production server= */ (await headers()).get('Host');

    if (requestOrigin?.includes('tests'))
        return <TestsIndexPage />;

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
                <LandingTile title="Peter Beverloo" image="/images/tile-peter.jpg" href="/about">
                    Software Engineer and Engineering Manager working on the Web on Android at
                    Google. You are visiting my website after all.
                </LandingTile>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <LandingTile title="Chromium's command line switches"
                             image="/images/tile-chromium.jpg"
                             href="/experiments/chromium-command-line-switches">
                    The more likely reason you are here. There's thousands, and automatically
                    generated documentation is available here.
                </LandingTile>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <LandingTile title="Blog archive" image="/images/tile-blog.jpg" href="/blog">
                    I published 151 articles between April 2010 and December 2013, largely focused
                    on changes that landed in Chromium and WebKit.
                </LandingTile>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <LandingTile title="Web Standard test cases" image="/images/tile-tests.jpg"
                             href="https://tests.peter.sh">
                    Canonical test cases and examples for Web Standards I was involved in, notably
                    Web Push Notifications and the Contacts API.
                </LandingTile>
            </Grid>
        </Grid>
    );
}

type LandingTileProps = {
    href: string;
    image: string;
    title: string;
};

function LandingTile(props: React.PropsWithChildren<LandingTileProps>) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardActionArea LinkComponent={Link} href={props.href}>
                <CardMedia component="img" height="175" image={props.image} alt={props.title} />
                <CardContent>
                    <Typography variant="h6" noWrap color="primary">
                        {props.title}
                    </Typography>
                    <Typography variant="body2">
                        {props.children}
                    </Typography>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
