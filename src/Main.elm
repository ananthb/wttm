port module Main exposing (main)

import Browser
import Html exposing (Html, a, button, div, h1, h2, img, input, kbd, label, li, p, section, span, text, ul)
import Html.Attributes exposing (alt, attribute, checked, class, disabled, href, rel, src, target, type_)
import Html.Events exposing (on, onClick, onCheck)
import Json.Decode as D
import Json.Encode as E
import Time


port toScene : E.Value -> Cmd msg


port fromScene : (D.Value -> msg) -> Sub msg


port openUrl : String -> Cmd msg


port navigate : String -> Cmd msg


port setMode : String -> Cmd msg


port enableGyro : String -> Cmd msg


port setRain : Bool -> Cmd msg



-- Model


type Phase
    = Attract
    | Entering
    | Inside
    | Blue


type Mode
    = ThreeD
    | Flat


type Status
    = Failed String
    | Ready Catalog


type alias App =
    { id : String
    , title : String
    , description : String
    , url : String
    , icon : String
    , favicon : String
    }


type alias Category =
    { id : String
    , label : String
    , icon : String
    , tier : Int
    , apps : List App
    }


type alias Catalog =
    { title : String
    , subtitle : String
    , blurb : String
    , email : Maybe String
    , scene : Maybe String
    , matrixRain : Bool
    , categories : List Category
    }


type alias Flags =
    { flat : Bool
    , webgl : Bool
    , touch : Bool
    , scene : Maybe String
    , catalog : String
    , reducedMotion : Bool
    , rain : Bool
    , rainEnabled : Bool
    }


type alias Model =
    { status : Status
    , phase : Phase
    , mode : Mode
    , touch : Bool
    , sceneOverride : Maybe String
    , idle : Int
    , hintMove : Bool
    , note : Maybe String
    , noteTtl : Int
    , reducedMotion : Bool
    , rain : Bool
    , rainEnabled : Bool
    , settingsOpen : Bool
    , expanded : List String
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    let
        decoded =
            if String.isEmpty flags.catalog then
                Nothing

            else
                Result.toMaybe (D.decodeString catalogDecoder flags.catalog)

        status =
            case decoded of
                Just catalog ->
                    Ready catalog

                Nothing ->
                    Failed "no catalog"

        model =
            { status = status
            , phase = Attract
            , mode = if flags.flat || not flags.webgl then Flat else ThreeD
            , touch = flags.touch
            , sceneOverride = flags.scene
            , idle = 0
            , hintMove = False
            , note = Nothing
            , noteTtl = 0
            , reducedMotion = flags.reducedMotion
            , rain = flags.rain
            , rainEnabled = flags.rainEnabled
            , settingsOpen = False
            , expanded = []
            }
    in
    ( model
    , case decoded of
        Just catalog ->
            Cmd.batch (setRain flags.rain :: toScene (encodeCatalog catalog) :: sceneCmd model catalog)

        Nothing ->
            setRain flags.rain
    )



-- Update


type Msg
    = Scene D.Value
    | Tick
    | ToggleMode
    | ToggleApp String
    | ToggleSettings
    | ToggleRain
    | DismissBlue
    | Touch String Bool
    | EnableGyro


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ToggleApp id ->
            ( { model | expanded = toggleMember id model.expanded }, Cmd.none )

        ToggleSettings ->
            ( { model | settingsOpen = not model.settingsOpen }, Cmd.none )

        ToggleRain ->
            if model.rainEnabled && not model.reducedMotion then
                let
                    next =
                        not model.rain
                in
                ( { model | rain = next }, setRain next )

            else
                ( model, Cmd.none )

        ToggleMode ->
            case model.mode of
                ThreeD ->
                    ( { model | mode = Flat }, setMode "flat" )

                Flat ->
                    ( { model | mode = ThreeD }
                    , Cmd.batch
                        (setMode "three"
                            :: (case model.status of
                                    Ready catalog ->
                                        toScene (encodeCatalog catalog) :: sceneCmd model catalog

                                    _ ->
                                        []
                               )
                        )
                    )

        Tick ->
            let
                idle =
                    model.idle + 1

                hint =
                    model.hintMove
                        || (model.mode == ThreeD && idle >= 30 && (model.phase == Entering || model.phase == Inside))

                noteTtl =
                    max 0 (model.noteTtl - 1)
            in
            ( { model
                | idle = idle
                , hintMove = hint
                , noteTtl = noteTtl
                , note = if noteTtl == 0 then Nothing else model.note
              }
            , Cmd.none
            )

        DismissBlue ->
            ( { model | phase = Attract }, toScene (E.object [ ( "type", E.string "reset" ) ]) )

        EnableGyro ->
            ( model, enableGyro "" )

        Touch key down ->
            ( { model | idle = 0, hintMove = False }
            , toScene
                (E.object
                    [ ( "type", E.string "input" )
                    , ( "key", E.string key )
                    , ( "down", E.bool down )
                    ]
                )
            )

        Scene value ->
            case D.decodeValue sceneDecoder value of
                Ok event ->
                    handleScene event model

                Err _ ->
                    ( model, Cmd.none )


handleScene : SceneEvent -> Model -> ( Model, Cmd Msg )
handleScene event model =
    case event of
        Pill "red" ->
            ( { model | phase = Entering, idle = 0, hintMove = False }
            , toScene (toSceneE "enter")
            )

        Pill "blue" ->
            ( { model | phase = Blue }, Cmd.none )

        Pill _ ->
            ( model, Cmd.none )

        Open id ->
            ( model, openApp id model )

        Login ->
            ( model, navigate "/login" )

        Hovered _ ->
            ( model, Cmd.none )

        SceneReady ->
            ( model, Cmd.none )

        Entered ->
            ( { model | phase = Inside, idle = 0, hintMove = False }, Cmd.none )

        Active ->
            ( { model | idle = 0, hintMove = False }, Cmd.none )

        Note message ->
            ( { model | note = Just message, noteTtl = 7 }, Cmd.none )

        NoGl ->
            ( { model | mode = Flat }, Cmd.none )


toSceneE : String -> E.Value
toSceneE kind =
    E.object [ ( "type", E.string kind ) ]


toggleMember : String -> List String -> List String
toggleMember id list =
    if List.member id list then
        List.filter (\x -> x /= id) list

    else
        id :: list


effectiveRain : Model -> Bool
effectiveRain model =
    model.rain && not model.reducedMotion


loggedIn : Model -> Bool
loggedIn model =
    case model.status of
        Ready catalog ->
            catalog.email /= Nothing

        _ ->
            False


sceneCmd : Model -> Catalog -> List (Cmd Msg)
sceneCmd model catalog =
    toScene (encodeAuth model)
        :: (case ( model.sceneOverride, catalog.scene ) of
                ( Just id, _ ) ->
                    [ toScene (encodeScene id) ]

                ( Nothing, Just id ) ->
                    [ toScene (encodeScene id) ]

                _ ->
                    []
           )


openApp : String -> Model -> Cmd Msg
openApp id model =
    case model.status of
        Ready catalog ->
            catalog.categories
                |> List.concatMap .apps
                |> List.filter (\app -> app.id == id)
                |> List.head
                |> Maybe.map (\app -> openUrl app.url)
                |> Maybe.withDefault Cmd.none

        _ ->
            Cmd.none



-- Subscriptions


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ fromScene Scene
        , Time.every 1000 (\_ -> Tick)
        ]



-- View


view : Model -> Html Msg
view model =
    case model.mode of
        Flat ->
            viewFlat model

        ThreeD ->
            div [ class "wttm scanlines vignette" ]
                [ Html.node "wttm-scene" [ class "scene" ] []
                , viewOverlay model
                ]


viewOverlay : Model -> Html Msg
viewOverlay model =
    div [ class "overlay" ]
        [ viewToggle model
        , viewHud model
        , viewCrosshair model
        , viewStatus model
        , viewNote model
        , viewFooter model
        , viewTouch model
        , viewBlue model
        ]


viewToggle : Model -> Html Msg
viewToggle model =
    button [ class "toggle", onClick ToggleMode ]
        [ text
            (case model.mode of
                Flat ->
                    "Enter the Matrix"

                ThreeD ->
                    "Simple view"
            )
        ]


viewCrosshair : Model -> Html Msg
viewCrosshair model =
    case model.phase of
        Entering ->
            div [ class "crosshair" ] []

        Inside ->
            div [ class "crosshair" ] []

        _ ->
            text ""


viewNote : Model -> Html Msg
viewNote model =
    case model.note of
        Just message ->
            div [ class "note" ] [ text message ]

        Nothing ->
            text ""


viewHud : Model -> Html Msg
viewHud model =
    let
        ( title, subtitle, blurb ) =
            case model.status of
                Ready catalog ->
                    ( catalog.title, catalog.subtitle, catalog.blurb )

                _ ->
                    ( "Welcome To The Matrix", "Wake up.", "" )

        who =
            case model.status of
                Ready catalog ->
                    catalog.email
                        |> Maybe.map (\email -> span [ class "who" ] [ text ("signed in as " ++ email) ])
                        |> Maybe.withDefault (span [ class "who" ] [])

                _ ->
                    span [ class "who" ] []
    in
    div [ class "hud" ]
        [ h1 [] [ text title ]
        , p [ class "subtitle" ] [ text subtitle ]
        , if String.isEmpty blurb then
            text ""

          else
            p [ class "blurb" ] [ text blurb ]
        , who
        ]


viewStatus : Model -> Html Msg
viewStatus model =
    case model.status of
        Failed why ->
            div [ class "status error" ] [ text ("signal lost · " ++ why) ]

        Ready _ ->
            text ""


viewFooter : Model -> Html Msg
viewFooter model =
    case model.phase of
        Blue ->
            text ""

        Attract ->
            div [ class "footer" ]
                [ div [ class "keys" ]
                    [ span [] [ text "choose a pill to wake up" ] ]
                , viewColophon model
                ]

        _ ->
            div [ class "footer" ]
                [ div
                    [ class
                        (if model.hintMove then
                            "keys hint"

                         else
                            "keys"
                        )
                    ]
                    (if model.touch then
                        [ span [] [ text "swipe to look · tap to open" ] ]

                     else
                        [ span [] [ kbd [] [ text "W A S D" ], text " ", kbd [] [ text "↑ ↓ ← →" ], text " move" ]
                        , span [] [ kbd [] [ text "mouse" ], text " look" ]
                        , span [] [ kbd [] [ text "click" ], text " open" ]
                        , span [] [ kbd [] [ text "Esc" ], text " release" ]
                        ]
                    )
                , viewColophon model
                ]


viewColophon : Model -> Html Msg
viewColophon model =
    div [ class "colophon" ]
        [ a [ class "brand", href "https://github.com/ananthb/wttm" ] [ text "wttm" ]
        , a [ class "license", href "https://github.com/ananthb/wttm/blob/main/LICENSE" ] [ text "AGPL-3.0" ]
        , viewAuth model
        ]


viewAuth : Model -> Html Msg
viewAuth model =
    if loggedIn model then
        a [ class "auth", href "/cdn-cgi/access/logout" ] [ text "log out" ]

    else
        a [ class "auth", href "/login" ] [ text "log in" ]


viewTouch : Model -> Html Msg
viewTouch model =
    if model.touch && model.mode == ThreeD && (model.phase == Entering || model.phase == Inside) then
        div [ class "touch" ]
            [ button
                [ class "pad up", onPointer "pointerdown" (Touch "KeyW" True), onPointer "pointerup" (Touch "KeyW" False), onPointer "pointerleave" (Touch "KeyW" False), onPointer "pointercancel" (Touch "KeyW" False) ]
                [ text "▲" ]
            , button
                [ class "pad left", onPointer "pointerdown" (Touch "KeyA" True), onPointer "pointerup" (Touch "KeyA" False), onPointer "pointerleave" (Touch "KeyA" False), onPointer "pointercancel" (Touch "KeyA" False) ]
                [ text "◀" ]
            , button
                [ class "pad right", onPointer "pointerdown" (Touch "KeyD" True), onPointer "pointerup" (Touch "KeyD" False), onPointer "pointerleave" (Touch "KeyD" False), onPointer "pointercancel" (Touch "KeyD" False) ]
                [ text "▶" ]
            , button
                [ class "pad down", onPointer "pointerdown" (Touch "KeyS" True), onPointer "pointerup" (Touch "KeyS" False), onPointer "pointerleave" (Touch "KeyS" False), onPointer "pointercancel" (Touch "KeyS" False) ]
                [ text "▼" ]
            , button [ class "gyro", onClick EnableGyro ] [ text "enable tilt" ]
            ]

    else
        text ""


onPointer : String -> Msg -> Html.Attribute Msg
onPointer name msg =
    on name (D.succeed msg)


viewBlue : Model -> Html Msg
viewBlue model =
    case model.phase of
        Blue ->
            div [ class "blue" ]
                [ div [ class "card" ]
                    [ h2 [] [ text "The story ends" ]
                    , p []
                        [ text
                            "You wake up in your bed and believe whatever you want to believe. Ignorance is bliss."
                        ]
                    , button [ onClick DismissBlue ] [ text "Take the red pill" ]
                    ]
                ]

        _ ->
            text ""


viewFlat : Model -> Html Msg
viewFlat model =
    div [ class "flat" ]
        [ Html.node "canvas" [ class "rain" ] []
        , div [ class "flat-inner" ]
            [ div [ class "flat-head" ]
                [ viewHud model
                , div [ class "flat-actions" ]
                    [ viewAuth model
                    , viewSettingsMenu model
                    , viewToggle model
                    ]
                ]
            , viewStatus model
            , viewFlatBody model
            , div [ class "flat-footer" ] [ viewColophon model ]
            ]
        ]


viewSettingsMenu : Model -> Html Msg
viewSettingsMenu model =
    div [ class "settings-wrap" ]
        [ viewSettingsButton model
        , viewSettings model
        ]


viewSettingsButton : Model -> Html Msg
viewSettingsButton model =
    button
        [ class "settings-button"
        , onClick ToggleSettings
        , attribute "aria-label" "Settings"
        , attribute "aria-expanded" (if model.settingsOpen then "true" else "false")
        ]
        [ text "⚙" ]


viewSettings : Model -> Html Msg
viewSettings model =
    if not model.settingsOpen then
        text ""

    else
        div [ class "settings" ]
            [ if model.rainEnabled then
                label [ class "setting" ]
                    [ input
                        [ type_ "checkbox"
                        , checked (effectiveRain model)
                        , disabled model.reducedMotion
                        , onCheck (\_ -> ToggleRain)
                        ]
                        []
                    , text "Matrix rain"
                    ]

              else
                p [ class "setting-hint" ] [ text "Matrix rain is off for this site." ]
            , if model.reducedMotion then
                p [ class "setting-hint" ] [ text "Off: your system asks for reduced motion." ]

              else
                text ""
            ]


viewFlatBody : Model -> Html Msg
viewFlatBody model =
    case model.status of
        Ready catalog ->
            div [ class "flat-catalog" ] (List.map (viewFlatCategory model) catalog.categories)

        _ ->
            text ""


viewFlatCategory : Model -> Category -> Html Msg
viewFlatCategory model category =
    section [ class "flat-category" ]
        [ h2 [] [ text category.label ]
        , ul [] (List.map (viewAppCard model) category.apps)
        ]


viewAppCard : Model -> App -> Html Msg
viewAppCard model app =
    let
        expanded =
            List.member app.id model.expanded

        hasDesc =
            not (String.isEmpty app.description)
    in
    li [ class ("card" ++ (if expanded then " expanded" else "")) ]
        [ div [ class "card-head" ]
            [ span [ class "card-icon" ]
                [ span [ class "card-emoji" ] [ text (emojiFor app) ]
                , faviconImg app
                ]
            , a
                [ class "card-title"
                , href app.url
                , target "_blank"
                , rel "noopener noreferrer"
                ]
                [ text app.title ]
            , if hasDesc then
                button
                    [ class "card-toggle"
                    , onClick (ToggleApp app.id)
                    , attribute "aria-expanded" (if expanded then "true" else "false")
                    , attribute "aria-label"
                        (if expanded then
                            "Hide description"

                         else
                            "Show description"
                        )
                    ]
                    [ text
                        (if expanded then
                            "▾"

                         else
                            "▸"
                        )
                    ]

              else
                text ""
            ]
        , if hasDesc then
            div [ class "card-body" ]
                [ p [] [ text app.description ]
                , a
                    [ class "card-open"
                    , href app.url
                    , target "_blank"
                    , rel "noopener noreferrer"
                    ]
                    [ text ("Open " ++ app.title) ]
                ]

          else
            text ""
        ]


emojiFor : App -> String
emojiFor app =
    if String.startsWith "http" app.icon then
        ""

    else
        app.icon


faviconImg : App -> Html Msg
faviconImg app =
    let
        source =
            if not (String.isEmpty app.favicon) then
                app.favicon

            else if String.startsWith "http" app.icon then
                app.icon

            else
                let
                    host =
                        hostOf app.url
                in
                if String.isEmpty host || localHost host then
                    ""

                else
                    originOf app.url ++ "/favicon.ico"
    in
    if String.isEmpty source then
        text ""

    else
        img
            [ class "card-favicon"
            , src source
            , alt ""
            , attribute "loading" "lazy"
            ]
            []


originOf : String -> String
originOf url =
    case String.split "://" url of
        scheme :: rest :: _ ->
            scheme ++ "://" ++ (rest |> String.split "/" |> List.head |> Maybe.withDefault rest)

        _ ->
            ""


hostOf : String -> String
hostOf url =
    case String.split "://" url of
        _ :: rest :: _ ->
            rest
                |> String.split "/"
                |> List.head
                |> Maybe.withDefault rest
                |> String.split ":"
                |> List.head
                |> Maybe.withDefault ""

        _ ->
            ""


-- A favicon fetched from a tailnet or LAN host is a request to the local
-- network, which browsers flag, so those keep the emoji (a catalog `favicon`
-- still overrides).
localHost : String -> Bool
localHost host =
    let
        h =
            String.toLower host

        suffix =
            List.any (\s -> String.endsWith s h)
                [ ".local", ".localdomain", ".internal", ".lan", ".home.arpa", ".ts.net", ".tailscale.net" ]
    in
    suffix || privateIp (String.split "." h)


privateIp : List String -> Bool
privateIp octets =
    case octets of
        "10" :: _ ->
            True

        "127" :: _ ->
            True

        "0" :: _ ->
            True

        "192" :: "168" :: _ ->
            True

        "169" :: "254" :: _ ->
            True

        "172" :: second :: _ ->
            inRange 16 31 second

        "100" :: second :: _ ->
            inRange 64 127 second

        _ ->
            False


inRange : Int -> Int -> String -> Bool
inRange lo hi value =
    case String.toInt value of
        Just n ->
            n >= lo && n <= hi

        Nothing ->
            False



-- Decoders / encoders


catalogDecoder : D.Decoder Catalog
catalogDecoder =
    D.map7 Catalog
        (D.field "title" D.string)
        (D.field "subtitle" D.string)
        (D.oneOf [ D.field "blurb" D.string, D.succeed "" ])
        (D.maybe (D.field "email" D.string))
        (D.oneOf [ D.field "scene" D.string |> D.map Just, D.succeed Nothing ])
        (D.oneOf [ D.field "matrixRain" D.bool, D.succeed True ])
        (D.field "categories" (D.list categoryDecoder))


categoryDecoder : D.Decoder Category
categoryDecoder =
    D.map5 Category
        (D.field "id" D.string)
        (D.field "label" D.string)
        (D.oneOf [ D.field "icon" D.string, D.succeed "" ])
        (D.oneOf [ D.field "tier" D.int, D.succeed 0 ])
        (D.field "apps" (D.list appDecoder))


appDecoder : D.Decoder App
appDecoder =
    D.map6 App
        (D.field "id" D.string)
        (D.field "title" D.string)
        (D.field "description" D.string)
        (D.field "url" D.string)
        (D.oneOf [ D.field "icon" D.string, D.succeed "" ])
        (D.oneOf [ D.field "favicon" D.string, D.succeed "" ])


type SceneEvent
    = Pill String
    | Open String
    | Login
    | Hovered String
    | SceneReady
    | Entered
    | Active
    | Note String
    | NoGl


sceneDecoder : D.Decoder SceneEvent
sceneDecoder =
    D.field "type" D.string
        |> D.andThen
            (\kind ->
                case kind of
                    "pill" ->
                        D.map Pill (D.field "pill" D.string)

                    "open" ->
                        D.map Open (D.field "id" D.string)

                    "login" ->
                        D.succeed Login

                    "hover" ->
                        D.map Hovered (D.field "id" D.string)

                    "ready" ->
                        D.succeed SceneReady

                    "entered" ->
                        D.succeed Entered

                    "active" ->
                        D.succeed Active

                    "note" ->
                        D.map Note (D.field "text" D.string)

                    "nogl" ->
                        D.succeed NoGl

                    _ ->
                        D.fail ("unknown scene event: " ++ kind)
            )


encodeCatalog : Catalog -> E.Value
encodeCatalog catalog =
    E.object
        [ ( "type", E.string "catalog" )
        , ( "title", E.string catalog.title )
        , ( "categories", E.list encodeCategory catalog.categories )
        ]


encodeCategory : Category -> E.Value
encodeCategory category =
    E.object
        [ ( "id", E.string category.id )
        , ( "label", E.string category.label )
        , ( "tier", E.int category.tier )
        , ( "apps", E.list encodeApp category.apps )
        ]


encodeApp : App -> E.Value
encodeApp app =
    E.object
        [ ( "id", E.string app.id )
        , ( "title", E.string app.title )
        , ( "description", E.string app.description )
        , ( "icon", E.string app.icon )
        ]


encodeScene : String -> E.Value
encodeScene id =
    E.object [ ( "type", E.string "scene" ), ( "id", E.string id ) ]


encodeAuth : Model -> E.Value
encodeAuth model =
    E.object
        [ ( "type", E.string "auth" )
        , ( "loggedIn", E.bool (loggedIn model) )
        ]


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }
