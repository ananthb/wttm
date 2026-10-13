port module Main exposing (main)

import Browser
import Html exposing (Html, a, button, div, h1, h2, kbd, li, p, section, span, text, ul)
import Html.Attributes exposing (class, href, rel, target)
import Html.Events exposing (onClick)
import Http
import Json.Decode as D
import Json.Encode as E
import Time


port toScene : E.Value -> Cmd msg


port fromScene : (D.Value -> msg) -> Sub msg


port openUrl : String -> Cmd msg



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
    = Loading
    | Failed String
    | Ready Catalog


type alias App =
    { id : String
    , title : String
    , description : String
    , url : String
    , icon : String
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
    , email : Maybe String
    , scene : Maybe String
    , categories : List Category
    }


type alias Flags =
    { flat : Bool
    , webgl : Bool
    , scene : Maybe String
    }


type alias Model =
    { status : Status
    , phase : Phase
    , mode : Mode
    , sceneOverride : Maybe String
    , idle : Int
    , hintMove : Bool
    , note : Maybe String
    , noteTtl : Int
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { status = Loading
      , phase = Attract
      , mode = if flags.flat || not flags.webgl then Flat else ThreeD
      , sceneOverride = flags.scene
      , idle = 0
      , hintMove = False
      , note = Nothing
      , noteTtl = 0
      }
    , Http.get { url = "/api/me", expect = Http.expectJson GotCatalog catalogDecoder }
    )



-- Update


type Msg
    = GotCatalog (Result Http.Error Catalog)
    | Scene D.Value
    | Tick
    | ToggleMode
    | DismissBlue


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotCatalog (Ok catalog) ->
            ( { model | status = Ready catalog }
            , Cmd.batch (toScene (encodeCatalog catalog) :: sceneCmd model catalog)
            )

        GotCatalog (Err err) ->
            ( { model | status = Failed (describeError err) }, Cmd.none )

        ToggleMode ->
            case model.mode of
                ThreeD ->
                    ( { model | mode = Flat }, Cmd.none )

                Flat ->
                    ( { model | mode = ThreeD }
                    , case model.status of
                        Ready catalog ->
                            Cmd.batch (toScene (encodeCatalog catalog) :: sceneCmd model catalog)

                        _ ->
                            Cmd.none
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
            , toScene (E.object [ ( "type", E.string "enter" ) ])
            )

        Pill "blue" ->
            ( { model | phase = Blue }, Cmd.none )

        Pill _ ->
            ( model, Cmd.none )

        Open id ->
            ( model, openApp id model )

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


sceneCmd : Model -> Catalog -> List (Cmd Msg)
sceneCmd model catalog =
    case ( model.sceneOverride, catalog.scene ) of
        ( Just id, _ ) ->
            [ toScene (encodeScene id) ]

        ( Nothing, Just id ) ->
            [ toScene (encodeScene id) ]

        _ ->
            []


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


describeError : Http.Error -> String
describeError err =
    case err of
        Http.BadUrl _ ->
            "bad url"

        Http.Timeout ->
            "timed out"

        Http.NetworkError ->
            "offline"

        Http.BadStatus code ->
            "http " ++ String.fromInt code

        Http.BadBody _ ->
            "bad response"



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
        , viewBlue model
        ]


viewToggle : Model -> Html Msg
viewToggle model =
    button
        [ class "toggle"
        , onClick ToggleMode
        ]
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
        ( title, subtitle ) =
            case model.status of
                Ready catalog ->
                    ( catalog.title, catalog.subtitle )

                _ ->
                    ( "Welcome To The Matrix", "Wake up." )

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
        , who
        ]


viewStatus : Model -> Html Msg
viewStatus model =
    case model.status of
        Loading ->
            div [ class "status" ] [ text "jack in" ]

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
                , span [ class "brand" ] [ text "wttm" ]
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
                    [ span [] [ kbd [] [ text "W A S D" ], text " ", kbd [] [ text "↑ ↓ ← →" ], text " move" ]
                    , span [] [ kbd [] [ text "mouse" ], text " look" ]
                    , span [] [ kbd [] [ text "click" ], text " open" ]
                    , span [] [ kbd [] [ text "Esc" ], text " release" ]
                    ]
                , span [ class "brand" ] [ text "wttm" ]
                ]


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
        [ viewToggle model
        , viewHud model
        , viewStatus model
        , viewFlatBody model
        ]


viewFlatBody : Model -> Html Msg
viewFlatBody model =
    case model.status of
        Ready catalog ->
            div [ class "flat-catalog" ]
                (List.map viewFlatCategory catalog.categories)

        _ ->
            text ""


viewFlatCategory : Category -> Html Msg
viewFlatCategory category =
    section [ class "flat-category" ]
        [ h2 [] [ text category.label ]
        , ul []
            (List.map
                (\app ->
                    li []
                        [ a
                            [ href app.url
                            , target "_blank"
                            , rel "noopener noreferrer"
                            ]
                            [ span [ class "flat-icon" ] [ text app.icon ]
                            , span [ class "flat-title" ] [ text app.title ]
                            , span [ class "flat-desc" ] [ text app.description ]
                            ]
                        ]
                )
                category.apps
            )
        ]



-- Decoders / encoders


catalogDecoder : D.Decoder Catalog
catalogDecoder =
    D.map5 Catalog
        (D.field "title" D.string)
        (D.field "subtitle" D.string)
        (D.maybe (D.field "email" D.string))
        (D.oneOf [ D.field "scene" D.string |> D.map Just, D.succeed Nothing ])
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
    D.map5 App
        (D.field "id" D.string)
        (D.field "title" D.string)
        (D.field "description" D.string)
        (D.field "url" D.string)
        (D.oneOf [ D.field "icon" D.string, D.succeed "" ])


type SceneEvent
    = Pill String
    | Open String
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


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }
