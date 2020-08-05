interface BroadcastMessage {
    type:
        | 'var_request'
        | 'var_response'
        | 'vuex_request'
        | 'vuex_response'
        | 'vuex_broadcast';
    sender: string;
    receiver: string;
    data: unknown;
}

interface VarRequestBroadcastMessage extends BroadcastMessage {
    type: 'var_request';
    data: {
        variablePath: string;
    };
}

interface VarResponseBroadcastMessage extends BroadcastMessage {
    type: 'var_response';
    data: {
        variablePath: string;
        value: unknown;
    };
}

interface VuexRequestBroadcastMessage extends BroadcastMessage {
    type: 'vuex_request';
    data: {
        statePath: string;
    };
}

interface VuexResponseBroadcastMessage extends BroadcastMessage {
    type: 'vuex_response';
    data: {
        statePath: string;
        value: unknown;
    };
}

interface VuexBroadcastMessage extends BroadcastMessage {
    type: 'vuex_broadcast';
    data: {
        mutationPath: string;
        value: unknown;
    };
}

type BroadcastMessageType =
    | VarRequestBroadcastMessage
    | VarResponseBroadcastMessage
    | VuexRequestBroadcastMessage
    | VuexResponseBroadcastMessage
    | VuexBroadcastMessage;
