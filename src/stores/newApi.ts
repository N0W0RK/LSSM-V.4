import { computed, ref, type Ref, watch } from 'vue';
// well, we cannot set default type import + non-default non-type import
// eslint-disable-next-line no-duplicate-imports
import type Vue from 'vue';

import { defineStore } from 'pinia';
import FetchApiWorker from '@workers/stores/api/fetchApi.worker';
import he from 'he';
import { SchoolingsWorker } from '@workers/stores/api/schoolings.worker';
import { useTranslationStore } from '@stores/translationUtilities';
import {
    type BuildingsByCategory,
    type BuildingsByDispatchCenter,
    type BuildingsByType,
    BuildingsWorker,
    FetchSingleBuildingWorker,
} from '@workers/stores/api/buildings.worker';
import {
    FetchSingleVehicleWorker,
    FetchVehiclesAtBuildingWorker,
    type VehiclesByBuilding,
    type VehiclesByDispatchCenter,
    type VehiclesByTarget,
    type VehiclesByType,
    type VehicleStates,
    VehiclesWorker,
} from '@workers/stores/api/vehicles.worker';
import MissionsWorker, {
    type MissionsArray,
    type MissionsById,
} from '@workers/stores/api/missionTypes.worker';

import type { AllianceInfo } from 'typings/api/AllianceInfo';
import type { Building } from 'typings/Building';
import type { CreditsInfo } from 'typings/api/Credits';
import type { Mission } from 'typings/Mission';
import type { Schooling } from 'typings/api/Schoolings';
import type { Settings } from 'typings/api/Settings';
import type { Vehicle } from 'typings/Vehicle';
import type { BuildingMarkerAdd, RadioMessage } from 'typings/Ingame';

// TODO: Switch to Maps instead of plain objects after switching to Vue3 (Vue2 does not support Maps without some hacks)
export interface APIs {
    vehicles: Record<Vehicle['id'], Vehicle>;
    buildings: Record<Building['id'], Building>;
    allianceinfo: AllianceInfo;
    credits: CreditsInfo;
    settings: Settings;
    schoolings: Schooling[];
    alliance_schoolings: Schooling[];
}
export type APIKey = keyof APIs;

type PromiseParam<ReturnType> = Parameters<
    ConstructorParameters<typeof Promise<ReturnType>>[0]
>;
type ApiUpdatePromise<Api extends APIKey> = readonly [
    PromiseParam<APIs[Api]>[0],
    PromiseParam<APIs[Api]>[1],
];

type RunningUpdatesMap = {
    [Api in APIKey]?: ApiUpdatePromise<Api>[];
};

const API_UPDATE_AFTER = 5 * 60 * 1000; // 5 Minutes
const API_UPDATE_AFTER_SCHOOLINGS = 30 * 1000; // 30 seconds

// TODO: Rename to defineAPIStore and id to api
export const defineNewAPIStore = defineStore('newApi', () => {
    const secretKey = ref<string>('');
    const currentlyRunningUpdates: RunningUpdatesMap = {};

    // we're storing the refs in an object to make it easier to access them dynamically
    const apiStorage: {
        [Api in APIKey]: Ref<APIs[Api]>;
    } = {
        vehicles: ref<APIs['vehicles']>({}),
        buildings: ref<APIs['buildings']>({}),
        allianceinfo: ref<APIs['allianceinfo']>({
            credits_total: 0,
            credits_current: 0,
            user_count: 0,
            user_online_count: 0,
            rank: 0,
            finance_active: false,
            users: [],
        }),
        credits: ref<APIs['credits']>({
            credits_user_current: 0,
            credits_user_total: 0,
            user_name: '',
            user_id: 0,
            user_toplist_position: 0,
            user_directplay_registered: false,
            user_email_registered: false,
            user_facebook_registered: false,
            user_apple_registered: false,
            user_level: 0,
            user_level_title: '',
        }),
        settings: ref<APIs['settings']>({
            aao_big: false,
            aao_search: false,
            aao_timer_show: false,
            alliance_mission_distance: 0,
            alliance_show_not_involved_vehicle: false,
            backalarm_automatic_rettungsdienst: false,
            critical_care_enabled: false,
            design_mode: 0,
            disable_event_missions: false,
            disable_mission_group_1: false,
            disable_mission_group_2: false,
            follow_up_missions_enabled: false,
            hide_anti_abuse_message: false,
            hide_faq_button: false,
            leitstelle_building_id: 0,
            lightbox_static: false,
            limited_vehicle_message_before_aao: false,
            mission_alarmed_successfull_close_window: false,
            mission_expansion: false,
            mission_expansion_fms_5: false,
            mobile_show_vehicle: false,
            mouse_over_disable_inactive_elements: false,
            patients_use_nef_count: false,
            poi_private: false,
            prisoner_transportation_delay: 0,
            prisoner_transportation_disabled: false,
            progress_animation: false,
            route_show: false,
            show_vehicle: false,
            start_view: 'map',
        }),
        schoolings: ref<APIs['schoolings']>([]),
        alliance_schoolings: ref<APIs['alliance_schoolings']>([]),
    };
    const lastUpdates = new Map<APIKey, number>();

    // region computed values and fake-computed values for vehicles
    // fake computed values require many iterations and are not suitable for the main thread
    // for performance reasons, they are calculated in a worker
    const vehiclesArray = computed<Vehicle[]>(() =>
        Object.values(apiStorage.vehicles.value)
    );
    const vehicleStates = ref<VehicleStates>({});
    const vehiclesByTarget = ref<VehiclesByTarget>({
        building: {},
        mission: {},
    });
    const vehiclesByType = ref<VehiclesByType>({});
    const vehiclesByBuilding = ref<VehiclesByBuilding>({});
    const vehiclesByDispatchCenter = ref<VehiclesByDispatchCenter>({});
    const participatedMissions = computed(() =>
        Object.keys(vehiclesByTarget.value.mission)
    );
    // endregion

    // region computed values and fake-computed values for buildings
    // fake computed values require many iterations and are not suitable for the main thread
    // for performance reasons, they are calculated in a worker
    const buildingsArray = computed<Building[]>(() =>
        Object.values(apiStorage.buildings.value)
    );
    const buildingsByType = ref<BuildingsByType>({});
    const buildingsByDispatchCenter = ref<BuildingsByDispatchCenter>({});
    const buildingsByCategory = ref<BuildingsByCategory>({});
    // endregion

    // region computed values and fake-computed values for schoolings & alliance_schoolings
    // fake computed values require many iterations and are not suitable for the main thread
    // for performance reasons, they are calculated in a worker
    const allSchoolings = ref<Schooling[]>([]);
    // endregion

    // auto-update
    setInterval(
        () => lastUpdates.forEach((_, api) => _updateAPI(api, 'autoUpdate')),
        API_UPDATE_AFTER
    );

    /**
     * Modify a RequestInit object to include the LSSM headers.
     * @param init - A RequestInit object that should be extended.
     * @param feature - The feature that is requesting the API.
     * @param isRequestToLSSMServer - A boolean indicating whether the request is to the LSSM server.
     * @returns The modified RequestInit object.
     */
    const _getRequestInit = (
        init: RequestInit,
        feature: string,
        isRequestToLSSMServer = false
    ) => {
        init.mode ||= 'cors';
        init.cache ||= 'no-cache';

        // convert headers to be a Headers object for easier manipulation
        init.headers = new Headers(init.headers);

        init.headers.set('X-LSS-Manager', VERSION);
        init.headers.set('X-LSS-Manager-Branch', BRANCH);
        init.headers.set('X-LSS-Manager-Feature', feature);

        if (isRequestToLSSMServer) {
            init.headers.set(
                'X-LSSM-User',
                btoa(`${secretKey.value}:${VERSION}-${MODE}`)
            );
        }

        // convert headers back to a plain object, otherwise it's not cloneable
        init.headers = Object.fromEntries(init.headers);

        return init;
    };

    /**
     * Trigger the complex calculations for a specific API.
     * @param api - The API to trigger the complex calculations for.
     */
    const _triggerComplexCalculations = async <Api extends APIKey>(
        api: Api
    ) => {
        if (api === 'vehicles') {
            const calculations = await VehiclesWorker.run(
                apiStorage.vehicles.value,
                apiStorage.buildings.value
            );
            vehicleStates.value = calculations.vehicleStates;
            vehiclesByTarget.value = calculations.vehiclesByTarget;
            vehiclesByType.value = calculations.vehiclesByType;
            vehiclesByBuilding.value = calculations.vehiclesByBuilding;
            vehiclesByDispatchCenter.value =
                calculations.vehiclesByDispatchCenter;
        } else if (api === 'buildings') {
            const calculations = await BuildingsWorker.run(
                apiStorage.buildings.value,
                useTranslationStore().buildingCategoryByType,
                vehiclesArray.value
            );
            buildingsByType.value = calculations.buildingsByType;
            buildingsByDispatchCenter.value =
                calculations.buildingsByDispatchCenter;
            buildingsByCategory.value = calculations.buildingsByCategory;
            vehiclesByDispatchCenter.value =
                calculations.vehiclesByDispatchCenter;
        } else if (api === 'schoolings' || api === 'alliance_schoolings') {
            const calculations = await SchoolingsWorker.run(
                apiStorage.schoolings.value,
                apiStorage.alliance_schoolings.value
            );
            allSchoolings.value = calculations.allSchoolings;
        }
    };

    /**
     * Store the API in the store and update the last update time.
     * Also calls a method to update the fake-computed values.
     * @param api - The API to store.
     * @param value - The value to store.
     * @returns A void promise.
     */
    const _storeApi = async <Api extends APIKey>(
        api: Api,
        value: APIs[Api]
    ) => {
        apiStorage[api].value = value;
        lastUpdates.set(api, Date.now());

        await _triggerComplexCalculations(api);

        return Promise.resolve(value);
    };

    /**
     * Fetch the API and update the store.
     * Do not fetch the API if there is already an update running but still resolve with the result of currently running update.
     * @param api - The API to fetch.
     * @param feature - The feature that is requesting the API.
     * @returns A promise that resolves with the fetched data.
     */
    const _updateAPI = <Api extends APIKey>(api: Api, feature: string) =>
        new Promise<APIs[Api]>((res, rej) => {
            // resolve and reject will be called when the fetch is done
            const callbackPromise = [res, rej] as const;

            // if there are callbacks
            const updateIsRunning =
                (currentlyRunningUpdates[api]?.length ?? 0) > 0;

            // add the "callback" to the list of callbacks
            currentlyRunningUpdates[api] ??= [];
            currentlyRunningUpdates[api]?.push(callbackPromise);

            // if there is already an update running, we don't need to start a new one
            if (updateIsRunning) return;

            const feat = `apiStore/_updateAPI:${api}(${feature})`;

            // let's start the update on a worker
            FetchApiWorker.run(api, _getRequestInit({}, feat))
                .then(value => _storeApi(api, value))
                .then(value => {
                    // success! let's resolve all the callbacks
                    let callback = currentlyRunningUpdates[api]?.shift();
                    while (callback) {
                        const [resolve] = callback;
                        resolve(value);
                        callback = currentlyRunningUpdates[api]?.shift();
                    }
                })
                .catch(value => {
                    // error! let's reject all the callbacks
                    let callback = currentlyRunningUpdates[api]?.shift();
                    while (callback) {
                        const [, reject] = callback;
                        reject(value);
                        callback = currentlyRunningUpdates[api]?.shift();
                    }
                });
        });

    /**
     * Returns the stored value of an API or fetches it if it's older than API_UPDATE_AFTER.
     * @param api - The API to get the value for.
     * @param feature - The feature that is requesting the API.
     * @returns A promise that resolves with the current API data.
     */
    const _getStoredOrFetch = <Api extends APIKey>(
        api: Api,
        feature: string
    ): Promise<APIs[Api]> => {
        const lastUpdate = lastUpdates.get(api) ?? 0;
        const updateAfter = ['schoolings', 'alliance_schoolings'].includes(api)
            ? API_UPDATE_AFTER_SCHOOLINGS
            : API_UPDATE_AFTER;
        if (lastUpdate < Date.now() - updateAfter)
            return _updateAPI(api, feature);
        return Promise.resolve(apiStorage[api].value);
    };

    /**
     * Update the vehicle store from the information of a single (potentially updated or new) vehicle.
     * @param vehicle - The vehicle that may be new or updated.
     * @returns The updated vehicle.
     */
    const _updateVehicle = (vehicle: Vehicle) => {
        const oldVehicle = apiStorage.vehicles.value[vehicle.id];

        // if the vehicle existed before, remove it from the fake computed values if needed
        if (oldVehicle) {
            if (oldVehicle.fms_real !== vehicle.fms_real)
                vehicleStates.value[oldVehicle.fms_real]--;

            if (
                oldVehicle.target_type &&
                oldVehicle.target_id &&
                (oldVehicle.target_type !== vehicle.target_type ||
                    oldVehicle.target_id !== vehicle.target_id)
            ) {
                delete vehiclesByTarget.value[oldVehicle.target_type][
                    oldVehicle.target_id
                ][vehicle.id];
                if (
                    Object.values(
                        vehiclesByTarget.value[oldVehicle.target_type]
                    ).length === 0
                )
                    delete vehiclesByTarget.value[oldVehicle.target_type];
            }

            if (oldVehicle.building_id !== vehicle.building_id) {
                delete vehiclesByBuilding.value[oldVehicle.building_id][
                    oldVehicle.id
                ];
                if (
                    Object.values(
                        vehiclesByBuilding.value[oldVehicle.building_id]
                    ).length === 0
                )
                    delete vehiclesByBuilding.value[oldVehicle.building_id];

                const building =
                    apiStorage.buildings.value[oldVehicle.building_id];
                const leitstelle = building?.leitstelle_building_id ?? -1;
                delete vehiclesByDispatchCenter.value[leitstelle][
                    oldVehicle.id
                ];
            }
        }

        // update the fake computed values
        vehicleStates.value[vehicle.fms_real] ||= 0;
        vehicleStates.value[vehicle.fms_real]++;

        if (vehicle.target_type && vehicle.target_id) {
            vehiclesByTarget.value[vehicle.target_type][vehicle.target_id] ||=
                {};
            vehiclesByTarget.value[vehicle.target_type][vehicle.target_id][
                vehicle.id
            ] = vehicle;
        }

        vehiclesByType.value[vehicle.vehicle_type] ||= {};
        vehiclesByType.value[vehicle.vehicle_type][vehicle.id] = vehicle;

        vehiclesByBuilding.value[vehicle.building_id] ||= {};
        vehiclesByBuilding.value[vehicle.building_id][vehicle.id] = vehicle;

        const building = apiStorage.buildings.value[vehicle.building_id];
        const leitstelle = building?.leitstelle_building_id ?? -1;
        vehiclesByDispatchCenter.value[leitstelle] ||= {};
        vehiclesByDispatchCenter.value[leitstelle][vehicle.id] = vehicle;

        // update the vehicle in the store
        apiStorage.vehicles.value[vehicle.id] = vehicle;

        // reassign values due to reactivity
        // TODO: Not necessary anymore with Maps and Sets (Vue3)
        apiStorage.vehicles.value = Object.assign(
            {},
            apiStorage.vehicles.value
        );
        vehicleStates.value = Object.assign({}, vehicleStates.value);
        vehiclesByType.value = Object.assign({}, vehiclesByType.value);
        vehiclesByTarget.value = Object.assign({}, vehiclesByTarget.value);
        vehiclesByBuilding.value = Object.assign({}, vehiclesByBuilding.value);
        vehiclesByDispatchCenter.value = Object.assign(
            {},
            vehiclesByDispatchCenter.value
        );

        return vehicle;
    };

    /**
     * Update the vehicle store from a radio message.
     * @param radioMessage - The radio message to update the vehicle store from.
     * @returns A promise that resolves when the update is finished.
     */
    const updateVehicleFromRadioMessage = async (
        radioMessage: RadioMessage
    ) => {
        // if not a vehicle fms message or not from the current user, ignore
        if (
            radioMessage.type !== 'vehicle_fms' ||
            radioMessage.user_id !== window.user_id
        )
            return;

        // we're going to update caption, fms, fms_real, target_type and target_id
        const vehicle = structuredClone(
            apiStorage.vehicles.value[radioMessage.id]
        );
        if (!vehicle) {
            return FetchSingleVehicleWorker.run(
                radioMessage.id,
                _getRequestInit({}, 'updateVehicleFromRadioMessage')
            ).then(_updateVehicle);
        }

        // update caption
        vehicle.caption = radioMessage.caption;
        // update fms and fms_real
        vehicle.fms_real = radioMessage.fms_real;
        vehicle.fms_show = radioMessage.fms;
        // update target_type and target_id
        vehicle.target_type = radioMessage.target_building_id
            ? 'building'
            : radioMessage.mission_id
              ? 'mission'
              : null;
        vehicle.target_id =
            vehicle.target_type === 'building'
                ? radioMessage.target_building_id
                : radioMessage.mission_id;

        return _updateVehicle(vehicle);
    };

    /**
     * Update the building store from the information of a single (potentially updated or new) building.
     * @param building - The building that may be new or updated.
     * @returns The updated building.
     */
    const _updateBuilding = (building: Building) => {
        const oldBuilding = apiStorage.buildings.value[building.id];

        // if the building existed before, remove it from the fake computed values if needed
        if (oldBuilding) {
            if (
                oldBuilding.leitstelle_building_id !==
                building.leitstelle_building_id
            ) {
                const leitstelle = oldBuilding.leitstelle_building_id ?? -1;
                delete buildingsByDispatchCenter.value[leitstelle][building.id];
                if (
                    Object.values(buildingsByDispatchCenter.value[leitstelle])
                        .length === 0
                )
                    delete buildingsByDispatchCenter.value[leitstelle];
            }
        }

        // update the fake computed values
        buildingsByType.value[building.building_type] ||= {};
        buildingsByType.value[building.building_type][building.id] = building;

        const leitstelle = building.leitstelle_building_id ?? -1;
        buildingsByDispatchCenter.value[leitstelle] ||= {};
        buildingsByDispatchCenter.value[leitstelle][building.id] = building;

        const category =
            useTranslationStore().buildingCategoryByType[
                building.building_type
            ];
        buildingsByCategory.value[category] ||= {};
        buildingsByCategory.value[category][building.id] = building;

        // update the building in the store
        apiStorage.buildings.value[building.id] = building;

        // reassign values due to reactivity
        // TODO: Not necessary anymore with Maps and Sets (Vue3)
        apiStorage.buildings.value = Object.assign(
            {},
            apiStorage.buildings.value
        );
        buildingsByType.value = Object.assign({}, buildingsByType.value);
        buildingsByDispatchCenter.value = Object.assign(
            {},
            buildingsByDispatchCenter.value
        );
        buildingsByCategory.value = Object.assign(
            {},
            buildingsByCategory.value
        );

        return building;
    };

    /**
     * Update the building store from a buildingMarkerAdd call.
     * @param buildingMarker - The building marker to update the building store from.
     * @returns A promise that resolves when the update is finished.
     */
    const updateBuildingFromBuildingMarkerAdd = (
        buildingMarker: BuildingMarkerAdd
    ) => {
        // if it is not our building, ignore it
        // TODO: Alliance buildings?
        if (buildingMarker.user_id !== window.user_id) return;

        // we're going to update caption, longitude and latitude, leitstelle_building_id
        const building = apiStorage.buildings.value[buildingMarker.id];
        if (!building) {
            return FetchSingleBuildingWorker.run(
                buildingMarker.id,
                _getRequestInit({}, 'updateBuildingFromBuildingMarkerAdd')
            ).then(_updateBuilding);
        }

        // update caption
        building.caption = he.decode(buildingMarker.name);
        // update longitude and latitude
        building.longitude = buildingMarker.longitude;
        building.latitude = buildingMarker.latitude;
        // update leitstelle_building_id
        building.leitstelle_building_id = buildingMarker.lbid;

        return _updateBuilding(building);
    };

    /**
     * Make a request to a URL.
     * @param inputOrUrl - Either a Request object or a URL string.
     * @param feature - The feature that is requesting the URL.
     * @param init - A RequestInit object to modify the request.
     * @param dialogOnError - A boolean indicating whether to show a dialog on a 500 error.
     * @returns A promise that resolves with the response.
     */
    const request = async (
        inputOrUrl: RequestInfo | URL,
        feature: string,
        init: RequestInit = {},
        dialogOnError: boolean = false
    ): Promise<Response> => {
        const requestUrl =
            inputOrUrl instanceof URL
                ? inputOrUrl.href
                : inputOrUrl instanceof Request
                  ? inputOrUrl.url
                  : inputOrUrl;
        const isRequestToLSSMServer = requestUrl.startsWith(SERVER);
        const requestInit = _getRequestInit(
            init,
            feature,
            isRequestToLSSMServer
        );

        const startTime = Date.now();

        const res = await fetch(inputOrUrl, requestInit);

        if (res.ok) return res;

        // request has not been okay

        // check if the response tells us that the currently used LSSM Version is out-of-date
        if (
            isRequestToLSSMServer &&
            res.headers.get('content-type')?.startsWith('application/json')
        ) {
            const data = await res.json();
            if (data.error === 'outdated version') {
                const LSSM = window[PREFIX] as Vue;
                LSSM.$modal.show('dialog', {
                    title: LSSM.$t('global.warnings.version.title'),
                    text: LSSM.$t('global.warnings.version.text', {
                        version: data.version,
                        curver: VERSION,
                    }),
                    buttons: [
                        {
                            title: LSSM.$t('global.warnings.version.close'),
                            default: true,
                            handler() {
                                window.location.reload(
                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                    // @ts-ignore
                                    true
                                );
                            },
                        },
                        {
                            title: LSSM.$t('global.warnings.version.abort'),
                            handler() {
                                LSSM.$modal.hide('dialog');
                            },
                        },
                    ],
                });
                window.focus();
            }
            return res;
        }

        // did the request end in a 500?
        if (dialogOnError && res.status === 500) {
            const LSSM = window[PREFIX] as Vue;
            LSSM.$modal.show('dialog', {
                title: LSSM.$t('global.error.requestIssue.title', {
                    status: res.status,
                    statusText: res.statusText,
                }),
                text: LSSM.$t('global.error.requestIssue.text', {
                    url: res.url,
                    status: res.status,
                    statusText: res.statusText,
                    method: init.method?.toUpperCase() ?? 'GET',
                    feature,
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                    uid: `${window.I18n.locale}-${window.user_id}`,
                }),
                buttons: [
                    {
                        title: LSSM.$t('global.error.requestIssue.close'),
                        default: true,
                        handler() {
                            LSSM.$modal.hide('dialog');
                        },
                    },
                ],
            });
        }

        return res;
    };

    // initially request the secret key of this user
    request(
        `/profile/external_secret_key/${window.user_id}`,
        'apiStore/_fetchSecretKey'
    )
        .then(res => res.json())
        .then(({ code }) => (secretKey.value = code));

    return {
        // TODO: remove the lastUpdate things, this is only for debugging purposes
        lastUpdates,
        // state: APIs
        ...apiStorage,
        // getters: get computed and fake-computed values
        vehiclesArray,
        vehicleStates,
        vehiclesByTarget,
        vehiclesByType,
        vehiclesByBuilding,
        vehiclesByDispatchCenter,
        participatedMissions,
        buildingsArray,
        buildingsByType,
        buildingsByDispatchCenter,
        buildingsByCategory,
        allSchoolings,
        // actions: get API data
        // vehicles
        getVehicles: (feature: string, returnAsArray = false) =>
            // for legacy reasons, optionally return the vehicles as an array
            _getStoredOrFetch('vehicles', feature).then(vehicles =>
                returnAsArray ? vehiclesArray.value : vehicles
            ),
        getVehicle: (id: number, feature: string) =>
            FetchSingleVehicleWorker.run(id, _getRequestInit({}, feature)).then(
                _updateVehicle
            ),
        getVehiclesAtBuilding: (id: number, feature: string) =>
            FetchVehiclesAtBuildingWorker.run(
                id,
                _getRequestInit({}, feature)
            ).then(vehicles => {
                vehicles.forEach(_updateVehicle);
                return vehicles;
            }),
        // buildings
        getBuildings: (feature: string, returnAsArray = false) =>
            // for legacy reasons, optionally return the buildings as an array
            _getStoredOrFetch('buildings', feature).then(buildings =>
                returnAsArray ? buildingsArray.value : buildings
            ),
        getBuilding: (id: number, feature: string) =>
            FetchSingleBuildingWorker.run(
                id,
                _getRequestInit({}, feature)
            ).then(_updateBuilding),
        // missionTypes
        getMissionTypes: (feature: string): Promise<MissionsById> =>
            MissionsWorker.run(
                window.I18n.locale,
                _getRequestInit({}, feature)
            ).then(({ missions }) => missions),
        getMissionType: (
            id: string,
            feature: string
        ): Promise<Mission | undefined> =>
            MissionsWorker.run(
                window.I18n.locale,
                _getRequestInit({}, feature)
            ).then(({ missions }) => missions[id]),
        getMissionTypesArray: (feature: string): Promise<MissionsArray> =>
            MissionsWorker.run(
                window.I18n.locale,
                _getRequestInit({}, feature)
            ).then(({ missionArray }) => missionArray),
        // allianceinfo
        getAllianceInfo: (feature: string) =>
            _getStoredOrFetch('allianceinfo', feature),
        // credits API
        getCredits: (feature: string) => _getStoredOrFetch('credits', feature),
        // settings API
        getSettings: (feature: string) =>
            _getStoredOrFetch('settings', feature),
        // schoolings API
        getSchoolings: (feature: string) =>
            _getStoredOrFetch('schoolings', feature),
        getAllianceSchoolings: (feature: string) =>
            _getStoredOrFetch('alliance_schoolings', feature),
        // mutations: update API data from ingame events
        updateVehicleFromRadioMessage,
        updateBuildingFromBuildingMarkerAdd,
        // utility functions
        request,
        awaitSecretKey: () =>
            new Promise<string>(resolve => {
                if (secretKey.value) return resolve(secretKey.value);
                const stopWatching = watch(secretKey, () => {
                    if (secretKey.value) {
                        stopWatching();
                        resolve(secretKey.value);
                    }
                });
            }),
    };
});

// TODO: Rename to useAPIStore
export const useNewAPIStore: () => ReturnType<typeof defineNewAPIStore> = () =>
    (window[PREFIX] as Vue)?.$stores?.newApi ?? defineNewAPIStore();
