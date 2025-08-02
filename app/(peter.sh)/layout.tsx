// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

/**
 * Layout for peter.sh, i.e. the main website. Will match the general style of tests.peter.sh, but
 * will also include a few more references to other (popular) pages on the website.
 */
export default function Layout(props: React.PropsWithChildren) {
    return (
        <div>
            <h1>peter.sh</h1>
            {props.children}
        </div>
    );
}
