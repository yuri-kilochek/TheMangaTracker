'use strict';

import '/thirdparty/jquery.js';

import AsyncStream from '/utility/AsyncStream.js';

let site = {
    search(query) {
        let searchOn = subdomain => {
            return AsyncStream.of('http://' + subdomain + '.mangahere.co/advsearch.htm')
                .ajax()
                .map(document => {
                    let form = $(document).find('#searchform');
                    
                    if (query.title !== '') {
                        form.find('input[name="name"]').val(query.title); 
                    }

                    if (query.writer !== '') {
                        form.find('input[name="author"]').val(query.writer); 
                    }

                    if (query.artist !== '') {
                        form.find('input[name="artist"]').val(query.artist); 
                    }

                    if (query.complete !== null) {
                        form.find('input[name="is_completed"]').val([query.complete ? 1 : 0]);
                    }

                    if (query.readingDirection === '<') {
                        form.find('input[name="direction"]').val(['rl']); 
                    } else if (query.readingDirection === '>') {
                        form.find('input[name="direction"]').val(['lr']); 
                    }

                    return {
                        action: form.attr('action'),
                        method: form.attr('method').toUpperCase(),
                        params: form.serializeArray(),
                    };
                })
                .map(data => AsyncStream.repeat(data))
                .flatten()
                .enumerate({ from: 1 })
                .map(([pageNo, data]) => {
                    return {
                        url: 'http://' + subdomain + '.mangahere.co' + data.action,
                        method: data.method,
                        data: data.params.concat([{ key: 'page', value: pageNo }]),
                    };
                })
                .ajax()
                .breakIf(document => $('.result_search .next-page', document).length == 0)  // nothing found
                .breakNextIf(document => $('.result_search .next-page .next', document).length == 0)  // no next page
                .map(document => AsyncStream.from($('.result_search a.manga_info', document).toArray()))
                .flatten()
                .map(anchor => {
                    return {
                        mangaTitle: $(anchor).text().trim(),
                        manga: anchor.href,
                    };
                })
            ;
        }

        let streams = [];

        if (query.languages.has('en')) {
            streams.push(searchOn('www'));
        }

        if (query.languages.has('es')) {
            streams.push(searchOn('es'));
        }

        return AsyncStream.join(...streams);
    }
};

export default site;

