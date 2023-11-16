import { RabbitUrl } from '../types';

export const normalizeUrl = (url: string | RabbitUrl): string => {
    if (typeof url === 'string') {
        return url;
    }
    const { protocol, username, password, hostname, port, vhost } = url;
    return `${ protocol }://${ username }:${ password }@${ hostname }:${ port }${ vhost }`;
};
