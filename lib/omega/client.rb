# Helper module to define omega clients / robots
#
# Copyright (C) 2012 Mohammed Morsi <mo@morsi.org>
# Licensed under the AGPLv3+ http://www.gnu.org/licenses/agpl.txt

require 'cosmos'
require 'manufactured'
require 'omega/client2/node'

module Omega
  module Client
    # Omega Client DSL, works best if you including this module in the
    # namespace you would like to use it, eg:
    #
    # @example using the dsl
    #   include Omega::Client::DSL
    #
    #   # create a new user
    #   user 'newuser', 'withpass'
    #
    #   # create a new galaxy/system/planet
    #   galaxy 'Zeus' do |g|
    #     system 'Athena', 'HR1925', :location => 
    #       Location.new(:x => 240, :y => -360, :z => 110) do |sys|
    #         planet 'Aphrodite', :movement_strategy =>
    #           Elliptical.new(:relative_to => Elliptical::RELATIVE_TO_FOCI, :speed => 0.1,
    #                          :eccentricity => 0.16, :semi_latus_rectum => 140,
    #                          :direction => Motel.random_axis)
    #     end
    #   end
    module DSL
      # Get/set parallel dsl config option.
      #
      # If this is set to true make sure to invoke
      # dsl_join at the end of your script below
      def self.parallel(val=nil)
        @parallel ||= false
        @parallel = val unless val.nil?
        @parallel
      end

      # Wait till all dsl threads are completed
      def dsl_join
        return unless @dsl_threads
        @dsl_threads << nil

        while dt = @dsl_threads.pop
          dt.join 
        end
      end

      # Create new dsl thread, invoking
      # dsl_join will block on all registered
      # dsl threads
      def dsl_thread(*args, &th)
        # just ignore thread and invoke block if parallel is not set
        return th.call unless Omega::Client::DSL.parallel

        @dsl_threads ||= Queue.new
        # TODO use thread pool?
        thd = Thread.new(*args, &th)
        @dsl_threads << thd
      end

      # Generate an return a random uuid
      #
      # @see Motel.gen_uuid
      def gen_uuid
        Motel.gen_uuid
      end

      # Generate an return a new random {Cosmos::Resource}
      #
      # @see Omega::Resources.rand_resource
      def rand_resource
        Omega::Resources.rand_resource
      end

      # Generate an return a new random {Motel::Location},
      # using the specified arguments
      #
      # @see Motel::Location.random
      def rand_location(args={})
        Motel::Location.random args
      end

      # Log a user into the specified node using the given
      # username / password
      #
      # @param [RJR::Node] node instance of rjr node or subclass to use to login the user
      # @param [String] username string id of the user to login
      # @param [String] password password of the user to login
      # @see Omega::Client::User.login
      def login(node, username, password)
        Omega::Client::Node.client_username = username
        Omega::Client::Node.client_password = password
        Omega::Client::Node.node = node
      end

      # Return user w/ the given username, else if it is not found create
      # it w/ the specified password and attributes
      #
      # Calls the specified block w/ the newly created user.
      #
      # @param [String] username string id to assign to the new user
      # @param [String] password password to assign to the new user
      # @param [Callable] bl option callback block parameter to call w/ the newly created user
      # @return [Users::User] user created
      def user(username, password = nil, args = {}, &bl)
        begin
          return Omega::Client::User.get(username)
        rescue Exception => e
        end

        @user = Users::User.new args.merge({:id => username, :password => password})
        Omega::Client::Node.invoke_request('users::create_entity', @user)
        bl.call @user unless bl.nil?
        @user
      end

      # Create a new role, or if @user is set, simply add the specified role id
      # to the user
      #
      # Operates in one of two modes depending on if @user is set. If it is, specify
      # a string role name to this function to be added to the user indicated by
      # @user. Else specify a Users::Role to create on the server side
      #
      # @param [Users::Role,String] nrole name of role to add to user or Users::Role to create on the server side
      def role(nrole)
        if @user
          RJR::Logger.info "Adding role #{nrole} to #{@user}"
          Omega::Client::Node.invoke_request('users::add_role', @user.id, nrole)

        else
          RJR::Logger.info "Creating role #{nrole}"
          Omega::Client::Node.invoke_request('users::create_entity', nrole)
        end
      end

      # Create a new alliance w/ the specified id and arguments
      # and return it.
      #
      # @param [String] id string id to assign to the new alliance
      # @param [Hash] args hash of options to pass directly to alliance initializer
      # @param [Callable] bl option callback block parameter to call w/ the newly created alliance
      # @return [Users::Alliance] alliance created
      def alliance(id, args = {}, &bl)
        alliance = Users::Alliance.new(args.merge({:id => id}))
        RJR::Logger.info "Creating alliance #{alliance}"
        Omega::Client::Node.invoke_request 'users::create_entity', alliance
        alliance
      end

      # Create a new galaxy w/ the specified id and arguments
      # and return it.
      #
      # @param [String] name string name to assign to the new galaxy
      # @param [Callable] bl option callback block parameter to call w/ the newly created galaxy
      # @return [Cosmos::Galaxy] galaxy created
      def galaxy(name, &bl)
        current_galaxy = Cosmos::Galaxy.new :name => name
        RJR::Logger.info "Creating galaxy #{current_galaxy}"
        Omega::Client::Node.invoke_request 'cosmos::create_entity', current_galaxy, :universe
        unless bl.nil?
          if Omega::Client::DSL.parallel
            dsl_thread {
              Thread.current["current_galaxy"] = current_galaxy
              bl.call current_galaxy
            }
          else
            Thread.current["current_galaxy"] = current_galaxy
            bl.call current_galaxy
          end
        end
        Thread.current['current_galaxy'] = nil
        current_galaxy
      end

      # Return the system specified corresponding to the given id, else if not found
      # created it and return it.
      #
      # If system does not exist, and we are creating a new one, current_galaxy and star_id
      # _must_ be set.
      #
      # @param [String] id string name of system to return or create
      # @param [String] star_id string name of star to create (only if system is being created)
      # @param [Hash] args hash of options to pass directly to system initializer
      # @param [Callable] bl option callback block parameter to call w/ the newly created system
      # @return [Cosmos::SolarSystem] system found or created
      def system(id, star_id = nil, args = {}, &bl)
        begin
          sys = Omega::Client::SolarSystem.get(id)
          unless bl.nil?
            dsl_thread {
              Thread.current["current_system"] = sys.entity
              bl.call sys.entity
              Thread.current['current_system'] = nil
            }
          end
          return sys
        rescue Exception => e
        end

        current_galaxy = Thread.current["current_galaxy"]
        raise ArgumentError, "current_galaxy must not be nil" if current_galaxy.nil?
        current_system = Cosmos::SolarSystem.new(args.merge({:name => id, :galaxy => current_galaxy}))
        star = Cosmos::Star.new :name => star_id, :solar_system => current_system
        RJR::Logger.info "Creating solar system #{current_system} under #{current_galaxy.name}"
        Omega::Client::Node.invoke_request 'cosmos::create_entity', current_system, current_galaxy.name
        unless star_id.nil?
          RJR::Logger.info "Creating star #{star} in #{current_system.name}"
          Omega::Client::Node.send_notification 'cosmos::create_entity', star, current_system.name
        end
        current_system = Omega::Client::SolarSystem.get(id)
        unless bl.nil?
          dsl_thread {
            Thread.current["current_system"] = current_system
            bl.call current_system
            Thread.current['current_system'] = nil
          }
        end
        current_system
      end

      # Create new asteroid and return it.
      #
      # current_system _must_ be set to the Cosmos::SolarSystem to create the
      # asteroid under
      #
      # @param [String] id string name of asteroid create
      # @param [Hash] args hash of options to pass directly to asteroid initializer
      # @param [Callable] bl option callback block parameter to call w/ the newly created asteroid
      # @return [Cosmos::Asteroid] asteroid created
      def asteroid(id, args={}, &bl)
        current_system = Thread.current["current_system"] || args[:system]
        raise ArgumentError, "current_system must not be nil" if current_system.nil?
        current_asteroid = Cosmos::Asteroid.new(args.merge({:name => id, :solar_system => current_system}))
        RJR::Logger.info "Creating asteroid #{current_asteroid} in #{current_system.name}"
        Omega::Client::Node.invoke_request 'cosmos::create_entity', current_asteroid, current_system.name
        Thread.current["current_asteroid"] = current_asteroid
        bl.call current_asteroid unless bl.nil?
        Thread.current['current_asteroid'] = nil
        current_asteroid
      end

      # Set new resource on an asteroid and return it.
      #
      # current_asteroid _must_ be set to the Cosmos::Asteroid to assoicate the
      # resource with
      #
      # @param [Hash] args hash of options to pass directly to resource initializer
      # @return [Cosmos::Resource] resource created
      def resource(args = {})
        current_asteroid = Thread.current["current_asteroid"]
        raise ArgumentError, "asteroid must not be nil" if current_asteroid.nil?
        rsc = Cosmos::Resource.new(args)
        quantity = args[:quantity]
        RJR::Logger.info "Adding #{quantity} of resource #{rsc.id} to #{current_asteroid.name}"
        Omega::Client::Node.send_notification 'cosmos::set_resource', current_asteroid.name, rsc, quantity
        rsc
      end

      # Create new planet and return it.
      #
      # current_system _must_ be set to the Cosmos::SolarSystem to create the
      # planet under
      #
      # @param [String] id string name of planet create
      # @param [Hash] args hash of options to pass directly to planet initializer
      # @param [Callable] bl option callback block parameter to call w/ the newly created planet
      # @return [Cosmos::Planet] planet created
      def planet(id, args={}, &bl)
        current_system = Thread.current["current_system"]
        raise ArgumentError, "current_system must not be nil" if current_system.nil?
        current_planet = Cosmos::Planet.new(args.merge({:name => id, :solar_system => current_system}))
        RJR::Logger.info "Creating planet #{current_planet} under #{current_system.name}"
        Omega::Client::Node.invoke_request 'cosmos::create_entity', current_planet, current_system.name
        Thread.current["current_planet"] = current_planet
        bl.call current_planet unless bl.nil?
        Thread.current['current_planet'] = nil
        current_planet
      end

      # Create new moon and return it.
      #
      # current_planet _must_ be set to the Cosmos::Planet to create the
      # moon under
      #
      # @param [String] id string name of moon create
      # @param [Hash] args hash of options to pass directly to moon initializer
      # @return [Cosmos::Moon] moon created
      def moon(id, args={})
        current_planet = Thread.current["current_planet"]
        raise ArgumentError, "planet must not be nil" if current_planet.nil?
        moon = Cosmos::Moon.new(args.merge({:name => id, :planet => current_planet}))
        RJR::Logger.info "Creating moon #{moon} under #{current_planet.name}"
        Omega::Client::Node.send_notification 'cosmos::create_entity', moon, current_planet.name
        moon
      end

      # Create new jump gate between two systems and return it
      #
      # @param [Cosmos::SolarSystem] system source solar system containing the jump gate
      # @param [Cosmos::SolarSystem] endpoint destination solar system which the jump gate leads to
      # @param [Hash] args hash of options to pass directly to jump gate initializer
      # @return [Cosmos::JumpGate] jump gate created
      def jump_gate(system, endpoint, args = {})
        gate = Cosmos::JumpGate.new(args.merge({:solar_system => system, :endpoint => endpoint}))
        RJR::Logger.info "Creating gate #{gate} under #{system.name}"
        gate = Omega::Client::Node.invoke_request 'cosmos::create_entity', gate, system.name
        gate
      end

      # Return station with the specified id if it exists, else
      # create new station and return it.
      #
      # Note callback will be invoked *before* station is created,
      # you may use it to set station parameters for creation
      #
      # @param [String] id string id of station create
      # @param [Hash] args hash of options to pass directly to station initializer
      # @param [Callable] bl option callback block parameter to call w/ station before it is created
      # @return [Manufactured::Station] station created
      def station(id, args={}, &bl)
        begin
          return Omega::Client::Station.get(id)
        rescue Exception => e
        end

        st = Manufactured::Station.new(args.merge({:id => id}))
        bl.call st unless bl.nil?
        RJR::Logger.info "Creating station #{st}"
        Omega::Client::Node.invoke_request 'manufactured::create_entity', st
        Omega::Client::Station.get(id)
      end

      # Retrieve ship with the specified id if it exists,
      # else create new ship and return it.
      #
      # Note callback will be invoked *before* ship is created,
      # you may use it to set ship parameters for creation
      #
      # @param [String] id string id of ship create
      # @param [Hash] args hash of options to pass directly to ship initializer
      # @param [Callable] bl option callback block parameter to call w/ ship before it is created
      # @return [Manufactured::Ship] ship created
      def ship(id, args={}, &bl)
        begin
          return Omega::Client::Ship.get(id)
        rescue Exception => e
        end

        sh = Manufactured::Ship.new(args.merge({:id => id}))
        bl.call sh unless bl.nil?
        RJR::Logger.info "Creating ship #{sh}"
        Omega::Client::Node.invoke_request 'manufactured::create_entity', sh
        Omega::Client::Ship.get(id)
      end

      # Schedule new periodic Missions Event
      #
      # @param [Integer] interval which event should occur
      # @param [Missions::Event] event event which to run at specified interval
      def schedule_event(interval, event)
        evnt = Missions::Events::Periodic.new :id => event.id + '-scheduler',
                                             :interval => interval, :event => event
        RJR::Logger.info "Scheduling event #{evnt}(#{event})"
        Omega::Client::Node.send_notification 'missions::create_event', evnt
        evnt
      end

      # Create a new Missions::Mission
      #
      # @param [String] id id to assign to new mission
      # @param[Hash[ args hash of options to pass directly to mission initializer
      def mission(id, args={})
        mission = Missions::Mission.new(args.merge({:id => id}))
        RJR::Logger.info "Creating mission #{mission}"
        Omega::Client::Node.send_notification 'missions::create_mission', mission
        mission
      end

    end
  end
end
